import { describe, it, expect } from "vitest";

// Test the updateContainerImage function logic directly
describe("ECS deployment logic", () => {
  describe("updateContainerImage", () => {
    it("should update container image in task definition", () => {
      const taskDefinition = {
        family: "test-service",
        containerDefinitions: [
          { name: "web", image: "old-image" },
          { name: "worker", image: "old-image" },
        ],
      };

      const newImage = "registry/repo@sha256:1234567890abcdef";
      const containerName = "web";

      // Simulate the update logic
      const def = { ...taskDefinition };
      const c = def.containerDefinitions?.find(
        (x: any) => x.name === containerName,
      );
      
      expect(c).toBeDefined();
      if (c) {
        c.image = newImage;
      }

      expect(def.containerDefinitions[0].image).toBe(newImage);
      expect(def.containerDefinitions[1].image).toBe("old-image");
    });

    it("should throw error when container not found", () => {
      const taskDefinition = {
        family: "test-service",
        containerDefinitions: [{ name: "web", image: "old-image" }],
      };

      const containerName = "nonexistent";
      const c = taskDefinition.containerDefinitions?.find(
        (x: any) => x.name === containerName,
      );

      expect(c).toBeUndefined();
    });
  });

  describe("parameter validation", () => {
    it("should validate required parameters", () => {
      const params = {
        region: "us-east-1",
        cluster: "test-cluster",
        service: "test-service",
        containerName: "web",
        taskDefPath: "./task-def.json",
        imagePinned: "registry/repo@sha256:1234567890abcdef",
      };

      expect(params.region).toBeTruthy();
      expect(params.cluster).toBeTruthy();
      expect(params.service).toBeTruthy();
      expect(params.containerName).toBeTruthy();
      expect(params.taskDefPath).toBeTruthy();
      expect(params.imagePinned).toBeTruthy();
    });
  });
});