import * as core from "@actions/core";
import * as github from "@actions/github";
import { finishedPayload, slackPost, startedPayload } from "./slackNotifier";
import { buildAndPush, getDigestForTag } from "./container";
import { deployEcs } from "./aws/ecs";
import { waitForAppRunnerDeployment } from "./aws/apprunner";

export function splitLines(s: string): string[] {
  return (s || "")
    .split(/\r?\n/)
    .map((x) => x.trim())
    .filter(Boolean);
}

async function run() {
  const target = core.getInput("target", { required: true });
  const region = core.getInput("awsRegion", { required: true });
  const ecrRepository = core.getInput("ecrRepository", { required: true });
  const imageTag = core.getInput("imageTag") || "staging";

  // Docker image
  const buildContext = core.getInput("buildContext") || ".";
  const dockerfile = core.getInput("dockerfile") || "Dockerfile";
  const buildTarget = core.getInput("buildTarget") || "";
  const buildPlatforms = core.getInput("buildPlatforms") || "";
  const buildArgs = splitLines(core.getInput("buildArgs"));
  const extraImageTags = splitLines(core.getInput("extraImageTags"));
  const extraLabels = splitLines(core.getInput("extraLabels"));

  // ECS
  const ecsCluster = core.getInput("ecsCluster");
  
  // 1. Web service
  const ecsServiceWeb = core.getInput("ecsServiceWeb");
  const taskDefWebPath = core.getInput("taskDefWebPath");
  const containerWebName = core.getInput("containerWebName") || "farweb";
  
  // 2. Worker service
  const ecsServiceWorker = core.getInput("ecsServiceWorker");
  const taskDefWorkerPath = core.getInput("taskDefWorkerPath");
  const containerWorkerName = core.getInput("containerWorkerName") || "farwork";

  //  3. Admin service (Optional)
  const ecsServiceAdmin = core.getInput("ecsServiceAdmin");
  const taskDefAdminPath = core.getInput("taskDefAdminPath");
  const containerAdminName = core.getInput("containerAdminName") || "farweb-admin";
  
  // Notifier
  const skipHealthCheck = core.getBooleanInput("skipHealthCheck") || false;
  const skipSlackNotify = core.getBooleanInput("skipSlackNotify") || false;

  const slackChannelId = core.getInput("slackChannelId");
  const environmentName = core.getInput("environmentName") || "Staging";
  const slackToken = process.env.SLACK_BOT_TOKEN || "";

  const repo =
    github.context.payload.repository?.full_name ??
    process.env.GITHUB_REPOSITORY ??
    "<repo>";
  const branch =
    github.context.ref?.split("/").pop() ??
    process.env.GITHUB_REF_NAME ??
    "<branch>";
  const runUrl = `${process.env.GITHUB_SERVER_URL}/${repo}/actions/runs/${process.env.GITHUB_RUN_ID}`;
  const actor =
    github.context.actor ??
    process.env.GITHUB_ACTOR ??
    "<actor>";

  if (slackChannelId && slackToken && !skipSlackNotify) {
    await slackPost(
      slackToken,
      slackChannelId,
      startedPayload(environmentName, target, runUrl, branch, repo, actor),
    );
  }

  try {
    const registry = process.env.AWS_ACCOUNT_ID
      ? `${process.env.AWS_ACCOUNT_ID}.dkr.ecr.${region}.amazonaws.com`
      : process.env.ECR_REGISTRY || "";

    const sha = (process.env.GITHUB_SHA || "").slice(0, 40);
    const baseTagSha = `${registry}/${ecrRepository}:${sha}`;
    const baseTagFriendly = `${registry}/${ecrRepository}:${imageTag}`;
    const tags = [
      baseTagSha,
      baseTagFriendly,
      ...extraImageTags.map((t) => `${registry}/${ecrRepository}:${t}`),
    ];

    await buildAndPush({
      context: buildContext,
      dockerfile,
      target: buildTarget || undefined,
      platforms: buildPlatforms || undefined,
      tags,
      buildArgs,
      labels: [
        `revision=${sha}`,
        `source=${repo}`,
        `version=${branch}`,
        ...extraLabels,
      ],
    });

    const digest = await getDigestForTag(baseTagFriendly);
    const imageRef = `${registry}/${ecrRepository}@${digest}`;
    core.setOutput("imageDigest", digest);
    core.setOutput("imageRef", imageRef);

    if (target === "ecs") {
      if (!ecsCluster || !ecsServiceWeb || !taskDefWebPath) {
        throw new Error(
          "ECS inputs missing: ecsCluster, ecsServiceWeb, taskDefWebPath (and optionally worker)",
        );
      }
      await deployEcs({
        region,
        cluster: ecsCluster,
        service: ecsServiceWeb,
        containerName: containerWebName,
        taskDefPath: taskDefWebPath,
        imagePinned: imageRef,
        skipHealthCheck,
      });
	  
      if (ecsServiceWorker && taskDefWorkerPath) {
        await deployEcs({
          region,
          cluster: ecsCluster,
          service: ecsServiceWorker,
          containerName: containerWorkerName,
          taskDefPath: taskDefWorkerPath,
          imagePinned: imageRef,
          skipHealthCheck,
        });
      }

	  if (ecsServiceAdmin && taskDefAdminPath) {
        await deployEcs({
          region,
          cluster: ecsCluster,
          service: ecsServiceAdmin,
          containerName: containerAdminName,
          taskDefPath: taskDefAdminPath,
          imagePinned: imageRef,
          skipHealthCheck,
        });
      }
    } else if (target === "apprunner") {
      const serviceArn = core.getInput("appRunnerServiceArn", {
        required: true,
      });

      const result = await waitForAppRunnerDeployment({
        region,
        serviceArn,
        maxAttempts: 6,
        intervalMs: 60_000,
      });

      if (result === "FAILED" || result === "UNKNOWN") {
        throw new Error(`AppRunner deployment status: ${result}`);
      }
    } else {
      throw new Error(`Unknown target: ${target}`);
    }

    if (slackChannelId && slackToken && !skipSlackNotify) {
      await slackPost(
        slackToken,
        slackChannelId,
        finishedPayload(
          environmentName,
          target,
          "success",
          imageRef,
          branch,
          repo,
          actor
        ),
      );
    }
  } catch (err: any) {
    core.setFailed(err?.message || String(err));
    if (slackChannelId && slackToken && !skipSlackNotify) {
      await slackPost(
        slackToken,
        slackChannelId,
        finishedPayload(
          environmentName,
          target,
          "failure",
          "<n/a>",
          branch,
          repo,
          actor
        ),
      );
    }
  }
}

if (require.main === module) {
  core.info("[XFLOWS] Starting actions ");

  run().catch((e) => {
    core.setFailed(e?.message ?? String(e));
  });

  core.info("[XFLOWS] DONE 👌");
}

export { run };
