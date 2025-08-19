import { describe, it, expect, vi } from "vitest";
import { slackPost, startedPayload, finishedPayload } from "../src/slackNotifier";
import fetch from "node-fetch";

vi.mock("node-fetch");

const mockedFetch = fetch as unknown as ReturnType<typeof vi.fn>;

describe("slackNotifier", () => {
  describe("slackPost", () => {
    it("should not send message if token is missing", async () => {
      await slackPost("", "channel", { text: "test" });
      expect(mockedFetch).not.toHaveBeenCalled();
    });

    it("should not send message if channel is missing", async () => {
      await slackPost("token", "", { text: "test" });
      expect(mockedFetch).not.toHaveBeenCalled();
    });

    it("should send message with correct parameters", async () => {
      mockedFetch.mockResolvedValueOnce({
        json: async () => ({ ok: true }),
      } as any);

      await slackPost("test-token", "test-channel", { text: "test message" });

      expect(mockedFetch).toHaveBeenCalledWith(
        "https://slack.com/api/chat.postMessage",
        {
          method: "POST",
          headers: {
            Authorization: "Bearer test-token",
            "Content-Type": "application/json; charset=utf-8",
          },
          body: JSON.stringify({
            channel: "test-channel",
            text: "test message",
          }),
        },
      );
    });
  });

  describe("startedPayload", () => {
    it("should create correct started payload", () => {
      const payload = startedPayload(
        "staging",
        "ecs",
        "https://github.com/test/repo/actions/runs/123",
        "main",
        "test/repo",
      );

      expect(payload).toEqual({
        text: ":rocket: Deploy started → ecs",
        attachments: [
          {
            color: "dbab09",
            fields: [
              { title: "Branch", value: "main", short: true },
              { title: "Repo", value: "test/repo", short: true },
              { title: "Env", value: "staging", short: true },
              {
                title: "Run",
                value: "https://github.com/test/repo/actions/runs/123",
                short: false,
              },
            ],
          },
        ],
      });
    });
  });

  describe("finishedPayload", () => {
    it("should create correct success payload", () => {
      const payload = finishedPayload(
        "staging",
        "ecs",
        "success",
        "registry/repo@sha256:abc123",
        "main",
        "test/repo",
      );

      expect(payload).toEqual({
        text: ":white_check_mark: Deploy success → ecs",
        attachments: [
          {
            color: "28a745",
            fields: [
              { title: "Branch", value: "main", short: true },
              { title: "Repo", value: "test/repo", short: true },
              { title: "Env", value: "staging", short: true },
              {
                title: "Image",
                value: "registry/repo@sha256:abc123",
                short: false,
              },
            ],
          },
        ],
      });
    });

    it("should create correct failure payload", () => {
      const payload = finishedPayload(
        "staging",
        "ecs",
        "failure",
        "registry/repo@sha256:abc123",
        "main",
        "test/repo",
      );

      expect(payload).toEqual({
        text: ":x: Deploy failure → ecs",
        attachments: [
          {
            color: "ff0000",
            fields: [
              { title: "Branch", value: "main", short: true },
              { title: "Repo", value: "test/repo", short: true },
              { title: "Env", value: "staging", short: true },
              {
                title: "Image",
                value: "registry/repo@sha256:abc123",
                short: false,
              },
            ],
          },
        ],
      });
    });
  });
});