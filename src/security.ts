import * as core from "@actions/core";
import { execa } from "execa";

export interface SecurityScanOptions {
  imageRef: string;
  severity?: string;
  ignoreUnfixed?: boolean;
  skipScan?: boolean;
}

export interface ScanResult {
  vulnerabilities: {
    CRITICAL: number;
    HIGH: number;
    MEDIUM: number;
    LOW: number;
    UNKNOWN: number;
  };
  summary: string;
  hasIssues: boolean;
}

export async function scanImageSecurity(
  opts: SecurityScanOptions
): Promise<ScanResult | null> {
  if (opts.skipScan) {
    core.info("🔍 Security scanning skipped");
    return null;
  }

  const severity = opts.severity || "HIGH,CRITICAL";
  const ignoreUnfixed = opts.ignoreUnfixed ?? true;

  core.info("🔍 Scanning image for security vulnerabilities...");

  try {
    // Check if Trivy is available
    try {
      await execa("trivy", ["--version"]);
    } catch (error) {
      core.warning("⚠️ Trivy not found, skipping security scan");
      core.info("💡 Install Trivy with: curl -sfL https://raw.githubusercontent.com/aquasecurity/trivy/main/contrib/install.sh | sh -s -- -b /usr/local/bin");
      return null;
    }

    // Run Trivy scan
    const { stdout } = await execa("trivy", [
      "image",
      "--format",
      "json",
      "--severity",
      severity,
      ignoreUnfixed ? "--ignore-unfixed" : "",
      opts.imageRef,
    ].filter(Boolean));

    const result = JSON.parse(stdout);
    
    // Parse results
    const vulnerabilities = {
      CRITICAL: 0,
      HIGH: 0,
      MEDIUM: 0,
      LOW: 0,
      UNKNOWN: 0,
    };

    if (result.Results) {
      for (const resultItem of result.Results) {
        if (resultItem.Vulnerabilities) {
          for (const vuln of resultItem.Vulnerabilities) {
            const severity = vuln.Severity?.toUpperCase() || "UNKNOWN";
            if (severity in vulnerabilities) {
              vulnerabilities[severity as keyof typeof vulnerabilities]++;
            }
          }
        }
      }
    }

    const totalVulns = Object.values(vulnerabilities).reduce((a, b) => a + b, 0);
    const hasCritical = vulnerabilities.CRITICAL > 0;
    const hasHigh = vulnerabilities.HIGH > 0;

    const scanResult: ScanResult = {
      vulnerabilities,
      summary: `Found ${totalVulns} vulnerabilities (${vulnerabilities.CRITICAL} CRITICAL, ${vulnerabilities.HIGH} HIGH)`,
      hasIssues: hasCritical || hasHigh,
    };

    // Display results as warnings (non-blocking)
    if (scanResult.hasIssues) {
      core.warning("🚨 Security vulnerabilities detected (non-blocking):");
      core.warning(`   ${scanResult.summary}`);
      
      if (vulnerabilities.CRITICAL > 0) {
        core.warning(`   ⚠️ ${vulnerabilities.CRITICAL} CRITICAL vulnerabilities found`);
      }
      if (vulnerabilities.HIGH > 0) {
        core.warning(`   ⚠️ ${vulnerabilities.HIGH} HIGH vulnerabilities found`);
      }
      
      core.info("💡 Review vulnerabilities with: trivy image --severity HIGH,CRITICAL <image>");
    } else {
      core.info("✅ No critical or high-severity vulnerabilities found");
    }

    if (vulnerabilities.MEDIUM > 0 || vulnerabilities.LOW > 0) {
      core.info(`ℹ️ ${vulnerabilities.MEDIUM} MEDIUM, ${vulnerabilities.LOW} LOW severity issues (informational)`);
    }

    return scanResult;

  } catch (error) {
    // Non-fatal error - just log as warning
    core.warning(`⚠️ Security scan failed: ${error}`);
    core.info("💡 Security scanning is optional and won't block deployment");
    return null;
  }
}

export async function installTrivy(): Promise<boolean> {
  try {
    core.info("📦 Installing Trivy for security scanning...");
    
    // Try to install Trivy
    await execa("curl", [
      "-sfL",
      "https://raw.githubusercontent.com/aquasecurity/trivy/main/contrib/install.sh",
      "|",
      "sh",
      "-s",
      "--",
      "-b",
      "/usr/local/bin"
    ], { shell: true });
    
    core.info("✅ Trivy installed successfully");
    return true;
  } catch (error) {
    core.warning("⚠️ Could not install Trivy automatically");
    return false;
  }
}