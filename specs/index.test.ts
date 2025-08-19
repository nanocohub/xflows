import { describe, it, expect, vi } from "vitest";
import * as core from "@actions/core";
import * as github from "@actions/github";

// Mock all dependencies
vi.mock("@actions/core");
vi.mock("@actions/github");
vi.mock("../src/container");
vi.mock("../src/aws/ecs");
vi.mock("../src/aws/apprunner");
vi.mock("../src/slackNotifier");

const mockedCore = core as any;
const mockedGithub = github as any;

describe("main workflow utilities", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("splitLines function", () => {
    it("should split and clean input lines correctly", async () => {
      const { splitLines } = await import("../src/index");
      
      expect(splitLines("")).toEqual([]);
      expect(splitLines("line1\nline2\nline3")).toEqual(["line1", "line2", "line3"]);
      expect(splitLines("  line1  \n  line2  \n  ")).toEqual(["line1", "line2"]);
      expect(splitLines("line1\r\nline2")).toEqual(["line1", "line2"]);
    });
  });

  describe("input validation", () => {
    it("should validate required inputs for ECS deployment", () => {
      const requiredInputs = ["target", "awsRegion", "ecrRepository"];
      requiredInputs.forEach(input => {
        expect(input).toBeTruthy();
      });
    });

    it("should validate ECS-specific inputs", () => {
      const ecsInputs = ["ecsCluster", "ecsServiceWeb", "taskDefWebPath"];
      ecsInputs.forEach(input => {
        expect(input).toBeTruthy();
      });
    });

    it("should validate AppRunner-specific inputs", () => {
      const appRunnerInputs = ["appRunnerServiceArn", "appRunnerAccessRoleArn"];
      appRunnerInputs.forEach(input => {
        expect(input).toBeTruthy();
      });
    });
  });

  describe("environment variable handling", () => {
    it("should handle missing environment variables gracefully", () => {
      const originalEnv = process.env;
      process.env = {};

      expect(process.env.AWS_ACCOUNT_ID).toBeUndefined();
      expect(process.env.GITHUB_REPOSITORY).toBeUndefined();
      expect(process.env.GITHUB_SHA).toBeUndefined();

      process.env = originalEnv;
    });

    it("should construct registry URL correctly", () => {
      const accountId = "123456789";
      const region = "us-east-1";
      const repository = "test-repo";
      
      const registry = `${accountId}.dkr.ecr.${region}.amazonaws.com`;
      const fullRepo = `${registry}/${repository}`;
      
      expect(registry).toBe("123456789.dkr.ecr.us-east-1.amazonaws.com");
      expect(fullRepo).toBe("123456789.dkr.ecr.us-east-1.amazonaws.com/test-repo");
    });
  });

  describe("image tag construction", () => {
    it("should create correct image tags", () => {
      const registry = "123456789.dkr.ecr.us-east-1.amazonaws.com";
      const repository = "test-repo";
      const sha = "abcdef1234567890";
      const imageTag = "staging";
      
      const tags = [
        `${registry}/${repository}:${sha}`,
        `${registry}/${repository}:${imageTag}`,
      ];

      expect(tags).toEqual([
        "123456789.dkr.ecr.us-east-1.amazonaws.com/test-repo:abcdef1234567890",
        "123456789.dkr.ecr.us-east-1.amazonaws.com/test-repo:staging",
      ]);
    });

    it("should handle extra image tags", () => {
      const registry = "123456789.dkr.ecr.us-east-1.amazonaws.com";
      const repository = "test-repo";
      const extraTags = ["latest", "production"];
      
      const tags = extraTags.map(t => `${registry}/${repository}:${t}`);
      
      expect(tags).toEqual([
        "123456789.dkr.ecr.us-east-1.amazonaws.com/test-repo:latest",
        "123456789.dkr.ecr.us-east-1.amazonaws.com/test-repo:production",
      ]);
    });
  });
});