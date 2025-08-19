import { describe, it, expect, vi } from "vitest";
import { buildAndPush, getDigestForTag, ecrLogin } from "../src/container";
import { execa } from "execa";

vi.mock("execa");
vi.mock("@actions/core", () => ({
  info: vi.fn(),
}));

const mockedExeca = execa as unknown as ReturnType<typeof vi.fn>;

describe("container", () => {
  describe("ecrLogin", () => {
    it("should login to ECR with provided credentials", async () => {
      mockedExeca.mockResolvedValueOnce({} as any);

      await ecrLogin("123456789.dkr.ecr.us-east-1.amazonaws.com", "AWS", "test-password");

      expect(mockedExeca).toHaveBeenCalledWith(
        "docker",
        ["login", "--username", "AWS", "--password-stdin", "123456789.dkr.ecr.us-east-1.amazonaws.com"],
        { input: "test-password" },
      );
    });
  });

  describe("buildAndPush", () => {
    it("should build and push with minimal parameters", async () => {
      mockedExeca.mockResolvedValueOnce({} as any);

      await buildAndPush({
        context: ".",
        dockerfile: "Dockerfile",
        tags: ["registry/repo:latest"],
        buildArgs: [],
        labels: [],
      });

      expect(mockedExeca).toHaveBeenCalledWith(
        "docker",
        [
          "buildx",
          "build",
          ".",
          "--file",
          "Dockerfile",
          "--push",
          "--pull",
          "--tag",
          "registry/repo:latest",
          "--cache-from",
          "type=gha",
          "--cache-to",
          "type=gha,mode=max",
        ],
        { stdio: "inherit" },
      );
    });

    it("should include platforms when provided", async () => {
      mockedExeca.mockResolvedValueOnce({} as any);

      await buildAndPush({
        context: ".",
        dockerfile: "Dockerfile",
        tags: ["registry/repo:latest"],
        buildArgs: [],
        labels: [],
        platforms: "linux/amd64,linux/arm64",
      });

      expect(mockedExeca).toHaveBeenCalledWith(
        "docker",
        expect.arrayContaining(["--platform", "linux/amd64,linux/arm64"]),
        { stdio: "inherit" },
      );
    });

    it("should include target when provided", async () => {
      mockedExeca.mockResolvedValueOnce({} as any);

      await buildAndPush({
        context: ".",
        dockerfile: "Dockerfile",
        tags: ["registry/repo:latest"],
        buildArgs: [],
        labels: [],
        target: "production",
      });

      expect(mockedExeca).toHaveBeenCalledWith(
        "docker",
        expect.arrayContaining(["--target", "production"]),
        { stdio: "inherit" },
      );
    });

    it("should include build args and labels when provided", async () => {
      mockedExeca.mockResolvedValueOnce({} as any);

      await buildAndPush({
        context: ".",
        dockerfile: "Dockerfile",
        tags: ["registry/repo:latest"],
        buildArgs: ["NODE_ENV=production", "VERSION=1.0.0"],
        labels: ["org.opencontainers.image.version=1.0.0"],
      });

      expect(mockedExeca).toHaveBeenCalledWith(
        "docker",
        expect.arrayContaining([
          "--build-arg",
          "NODE_ENV=production",
          "--build-arg",
          "VERSION=1.0.0",
          "--label",
          "org.opencontainers.image.version=1.0.0",
        ]),
        { stdio: "inherit" },
      );
    });

    it("should handle empty build args and labels", async () => {
      mockedExeca.mockResolvedValueOnce({} as any);

      await buildAndPush({
        context: ".",
        dockerfile: "Dockerfile",
        tags: ["registry/repo:latest"],
        buildArgs: ["", "  ", "NODE_ENV=production"],
        labels: ["", "  ", "org.opencontainers.image.version=1.0.0"],
      });

      expect(mockedExeca).toHaveBeenCalledWith(
        "docker",
        expect.arrayContaining([
          "--build-arg",
          "NODE_ENV=production",
          "--label",
          "org.opencontainers.image.version=1.0.0",
        ]),
        { stdio: "inherit" },
      );
    });
  });

  describe("getDigestForTag", () => {
    it("should extract digest from docker output", async () => {
      mockedExeca.mockResolvedValueOnce({
        stdout: `Name:      registry/repo:tag
Digest:    sha256:1234567890abcdef
Format:    Docker`,
      } as any);

      const digest = await getDigestForTag("registry/repo:tag");
      expect(digest).toBe("sha256:1234567890abcdef");
    });

    it("should throw error when digest not found", async () => {
      mockedExeca.mockResolvedValueOnce({
        stdout: `Name:      registry/repo:tag
Format:    Docker`,
      } as any);

      await expect(getDigestForTag("registry/repo:tag")).rejects.toThrow(
        "Cannot determine digest for registry/repo:tag",
      );
    });

    it("should call docker buildx imagetools inspect", async () => {
      mockedExeca.mockResolvedValueOnce({
        stdout: `Digest: sha256:1234567890abcdef`,
      } as any);

      await getDigestForTag("registry/repo:tag");

      expect(mockedExeca).toHaveBeenCalledWith("docker", [
        "buildx",
        "imagetools",
        "inspect",
        "registry/repo:tag",
      ]);
    });
  });
});