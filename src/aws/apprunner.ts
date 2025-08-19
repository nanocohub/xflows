import * as core from "@actions/core";
import {
  AppRunnerClient,
  ListOperationsCommand,
  OperationSummary,
} from "@aws-sdk/client-apprunner";

export type DeploymentStatus =
  | "SUCCEEDED"
  | "FAILED"
  | "IN_PROGRESS"
  | "UNKNOWN";

function latestStartDeploymentStatus(
  list?: OperationSummary[],
): DeploymentStatus {
  if (!list || list.length === 0) return "UNKNOWN";
  // Filter START_DEPLOYMENT operations, sort by StartedAt desc, pick first
  const latest = list
    .filter((op) => op.Type === "START_DEPLOYMENT")
    .sort((a, b) => {
      const ta = (a.StartedAt ?? 0) as unknown as number;
      const tb = (b.StartedAt ?? 0) as unknown as number;
      return tb - ta;
    })[0];

  return (latest?.Status as DeploymentStatus) ?? "UNKNOWN";
}

/**
 * Poll only: DO NOT update service.
 * Waits until the latest START_DEPLOYMENT operation becomes SUCCEEDED or FAILED.
 */
export async function waitForAppRunnerDeployment(params: {
  region: string;
  serviceArn: string;
  maxAttempts?: number; // default 6
  intervalMs?: number; // default 60_000
}): Promise<DeploymentStatus> {
  const { region, serviceArn, maxAttempts = 6, intervalMs = 60_000 } = params;
  const client = new AppRunnerClient({ region });

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    core.info(
      `(AppRunner) Checking deployment status (attempt ${attempt}/${maxAttempts})`,
    );

    const resp = await client.send(
      new ListOperationsCommand({ ServiceArn: serviceArn }),
    );
    const status = latestStartDeploymentStatus(resp.OperationSummaryList);

    core.info(`(AppRunner) Latest START_DEPLOYMENT status: ${status}`);

    if (status === "FAILED") return status;
    if (status === "SUCCEEDED") return status;

    if (attempt < maxAttempts) {
      await new Promise((r) => setTimeout(r, intervalMs));
    }
  }

  core.warning(`(AppRunner) Timed out after ${maxAttempts} checks.`);
  return "UNKNOWN";
}
