import * as fs from "fs";
import * as path from "path";
import * as core from "@actions/core";
import { ECSClient, RegisterTaskDefinitionCommand, UpdateServiceCommand, DescribeServicesCommand, } from "@aws-sdk/client-ecs";
function updateContainerImage(td, containerName, newImage) {
    const def = { ...td };
    const c = def.containerDefinitions?.find((x) => x.name === containerName);
    if (!c)
        throw new Error(`Container '${containerName}' not found in task def`);
    c.image = newImage;
    return def;
}
export async function deployEcs(params) {
    const ecs = new ECSClient({ region: params.region });
    const raw = fs.readFileSync(path.resolve(params.taskDefPath), "utf8");
    const baseTd = JSON.parse(raw);
    const nextTd = updateContainerImage(baseTd, params.containerName, params.imagePinned);
    const reg = await ecs.send(new RegisterTaskDefinitionCommand(nextTd));
    const newFamilyRev = reg.taskDefinition?.taskDefinitionArn;
    if (!newFamilyRev)
        throw new Error("Failed to register new task definition");
    await ecs.send(new UpdateServiceCommand({
        cluster: params.cluster,
        service: params.service,
        taskDefinition: newFamilyRev,
    }));
    // Wait for stable (simple poll)
    for (let i = 0; i < 60; i++) {
        const d = await ecs.send(new DescribeServicesCommand({
            cluster: params.cluster,
            services: [params.service],
        }));
        const svc = d.services?.[0];
        const primary = svc?.deployments?.find((x) => x.status === "PRIMARY");
        const pending = svc?.deployments?.some((x) => x.rolloutState === "IN_PROGRESS");
        if (primary && !pending && primary.rolloutState === "COMPLETED") {
            core.info(`ECS service ${params.service} is stable`);
            return;
        }
        await new Promise((r) => setTimeout(r, 5000));
    }
    core.warning(`Timed out waiting for ECS service ${params.service} to stabilize`);
}
