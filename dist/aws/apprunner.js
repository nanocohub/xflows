import * as core from "@actions/core";
import { AppRunnerClient, ListOperationsCommand, } from "@aws-sdk/client-apprunner";
function latestStartDeploymentStatus(list) {
    if (!list || list.length === 0)
        return "UNKNOWN";
    // Filter START_DEPLOYMENT operations, sort by StartedAt desc, pick first
    const latest = list
        .filter((op) => op.Type === "START_DEPLOYMENT")
        .sort((a, b) => {
        const ta = (a.StartedAt ?? 0);
        const tb = (b.StartedAt ?? 0);
        return tb - ta;
    })[0];
    return latest?.Status ?? "UNKNOWN";
}
/**
 * Poll only: DO NOT update service.
 * Waits until the latest START_DEPLOYMENT operation becomes SUCCEEDED or FAILED.
 */
export async function waitForAppRunnerDeployment(params) {
    const { region, serviceArn, maxAttempts = 6, intervalMs = 60000 } = params;
    const client = new AppRunnerClient({ region });
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        core.info(`(AppRunner) Checking deployment status (attempt ${attempt}/${maxAttempts})`);
        const resp = await client.send(new ListOperationsCommand({ ServiceArn: serviceArn }));
        const status = latestStartDeploymentStatus(resp.OperationSummaryList);
        core.info(`(AppRunner) Latest START_DEPLOYMENT status: ${status}`);
        if (status === "FAILED")
            return status;
        if (status === "SUCCEEDED")
            return status;
        if (attempt < maxAttempts) {
            await new Promise((r) => setTimeout(r, intervalMs));
        }
    }
    core.warning(`(AppRunner) Timed out after ${maxAttempts} checks.`);
    return "UNKNOWN";
}
