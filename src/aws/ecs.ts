import * as fs from "fs";
import * as path from "path";
import * as core from "@actions/core";
import {
  ECSClient,
  RegisterTaskDefinitionCommand,
  UpdateServiceCommand,
  DescribeServicesCommand,
} from "@aws-sdk/client-ecs";

type TD = any; // keep flexible

function updateContainerImage(td: TD, containerName: string, newImage: string) {
  const def = { ...td };
  const c = def.containerDefinitions?.find(
    (x: any) => x.name === containerName,
  );
  if (!c) throw new Error(`Container '${containerName}' not found in task def`);
  c.image = newImage;
  return def;
}

export async function deployEcs(params: {
  region: string;
  cluster: string;
  service: string;
  containerName: string;
  taskDefPath: string;
  imagePinned: string; // registry/repo@sha256:...
  skipHealthCheck?: boolean; // Option to skip waiting for service stability
}) {
  const ecs = new ECSClient({ region: params.region });

  const raw = fs.readFileSync(path.resolve(params.taskDefPath), "utf8");
  const baseTd = JSON.parse(raw);

  const nextTd = updateContainerImage(
    baseTd,
    params.containerName,
    params.imagePinned,
  );
  const reg = await ecs.send(new RegisterTaskDefinitionCommand(nextTd));
  const newFamilyRev = reg.taskDefinition?.taskDefinitionArn;
  if (!newFamilyRev) throw new Error("Failed to register new task definition");

  await ecs.send(
    new UpdateServiceCommand({
      cluster: params.cluster,
      service: params.service,
      taskDefinition: newFamilyRev,
    }),
  );

  // Skip health check if requested
  if (params.skipHealthCheck) {
    core.info(`Skipping health check for ECS service ${params.cluster}/${params.service} to save time`);
    core.info(`Task definition update triggered successfully, but deployment stability is not being verified`);
    core.warning(`⚠️ Note: Skipping health checks may hide deployment issues. Use in CI/CD environments only.`);
    return;
  }

  // Wait for stable (enhanced monitoring with early failure detection)
  const maxAttempts = 60;
  const pollingIntervalMs = 5000;
  const serviceDetails = `${params.cluster}/${params.service}`;
  
  core.info(`Waiting for ECS service ${serviceDetails} to stabilize...`);
  
  for (let i = 0; i < maxAttempts; i++) {
    const d = await ecs.send(
      new DescribeServicesCommand({
        cluster: params.cluster,
        services: [params.service],
      }),
    );
    
    const svc = d.services?.[0];
    if (!svc) {
      core.error(`Service ${serviceDetails} not found`);
      throw new Error(`ECS service ${serviceDetails} not found`);
    }
    
    const primary = svc?.deployments?.find((x) => x.status === "PRIMARY");
    const pending = svc?.deployments?.some((x) => x.rolloutState === "IN_PROGRESS");
    
    // Log detailed information about the deployment status
    core.info(`Deployment status [${i+1}/${maxAttempts}]: ${primary?.rolloutState || "UNKNOWN"}`);
    
    if (svc.events && svc.events.length > 0) {
      // Log the latest event
      core.info(`Latest event: ${svc.events[0].message}`);
    }
    
    // Success case
    if (primary && !pending && primary.rolloutState === "COMPLETED") {
      core.info(`✅ ECS service ${serviceDetails} is stable`);
      return;
    }
    
    // Failure detection
    if (primary && primary.rolloutState === "FAILED") {
      core.error(`❌ ECS deployment for ${serviceDetails} has failed`);
      core.error(`Reason: ${primary.rolloutStateReason || "Unknown reason"}`);
      throw new Error(`ECS deployment failed: ${primary.rolloutStateReason || "Unknown error"}`);
    }
    
    // Check for task failures
    if (svc.events && svc.events.length > 0) {
      const recentEvents = svc.events.slice(0, 5);
      const failureIndicators = recentEvents.some(event => {
        const msg = event.message?.toLowerCase() || "";
        return (
          msg.includes("unhealthy") || 
          msg.includes("failed") || 
          msg.includes("error") ||
          msg.includes("unable to place task")
        );
      });
      
      if (failureIndicators) {
        core.warning(`⚠️ Potential issues detected in service ${serviceDetails}:`);
        recentEvents.forEach(event => {
          core.warning(`- ${event.message}`);
        });
      }
    }
    
    // Show deployment progress percentages if available
    if (primary && primary.desiredCount && primary.desiredCount > 0) {
      const runningCount = primary.runningCount || 0;
      const desiredCount = primary.desiredCount;
      const progress = Math.floor((runningCount / desiredCount) * 100);
      core.info(`Deployment progress: ${progress}% (${runningCount}/${desiredCount} tasks running)`);
    }
    
    await new Promise((r) => setTimeout(r, pollingIntervalMs));
  }
  
  core.error(
    `⏱️ Timed out after ${maxAttempts * pollingIntervalMs / 60000} minutes waiting for ECS service ${serviceDetails} to stabilize`
  );
  throw new Error(`Deployment timeout for ECS service ${serviceDetails}`);

}
