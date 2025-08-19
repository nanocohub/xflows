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

  const buildContext = core.getInput("buildContext") || ".";
  const dockerfile = core.getInput("dockerfile") || "Dockerfile";
  const buildTarget = core.getInput("buildTarget") || "";
  const buildPlatforms = core.getInput("buildPlatforms") || "";
  const buildArgs = splitLines(core.getInput("buildArgs"));
  const extraImageTags = splitLines(core.getInput("extraImageTags"));
  const extraLabels = splitLines(core.getInput("extraLabels"));

  // ECS inputs
  const ecsCluster = core.getInput("ecsCluster");
  const ecsServiceWeb = core.getInput("ecsServiceWeb");
  const ecsServiceWorker = core.getInput("ecsServiceWorker");
  const taskDefWebPath = core.getInput("taskDefWebPath");
  const taskDefWorkerPath = core.getInput("taskDefWorkerPath");
  const containerWebName = core.getInput("containerWebName") || "web";
  const containerWorkerName = core.getInput("containerWorkerName") || "sidekiq";

  // Slack
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

  // Notify start
  if (slackChannelId && slackToken) {
    await slackPost(
      slackToken,
      slackChannelId,
      startedPayload(environmentName, target, runUrl, branch, repo),
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
        `org.opencontainers.image.revision=${sha}`,
        `org.opencontainers.image.source=${repo}`,
        `org.opencontainers.image.version=${branch}`,
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
      });
      if (ecsServiceWorker && taskDefWorkerPath) {
        await deployEcs({
          region,
          cluster: ecsCluster,
          service: ecsServiceWorker,
          containerName: containerWorkerName,
          taskDefPath: taskDefWorkerPath,
          imagePinned: imageRef,
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

    if (slackChannelId && slackToken) {
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
        ),
      );
    }
  } catch (err: any) {
    core.setFailed(err?.message || String(err));
    if (slackChannelId && slackToken) {
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
        ),
      );
    }
  }
}

if (require.main === module) {
  run();
}

export { run };
