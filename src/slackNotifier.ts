import * as core from "@actions/core";
import fetch from "node-fetch";

type SlackPayload = Record<string, unknown>;

export async function slackPost(
  token: string,
  channelId: string,
  payload: SlackPayload,
) {
  if (!token || !channelId) return;
  const resp = await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json; charset=utf-8",
    },
    body: JSON.stringify({ channel: channelId, ...payload }),
  });
  const json = await resp.json();
  if (!(json as any).ok) {
    core.warning(`Slack error: ${JSON.stringify(json)}`);
  }
}

export function startedPayload(
  envName: string,
  target: string,
  runUrl: string,
  branch: string,
  repo: string,
) {
  return {
    text: `:rocket: Deploy started → ${target}`,
    attachments: [
      {
        color: "dbab09",
        fields: [
          { title: "Branch", value: branch, short: true },
          { title: "Repo", value: repo, short: true },
          { title: "Env", value: envName, short: true },
          { title: "Run", value: runUrl, short: false },
        ],
      },
    ],
  };
}

export function finishedPayload(
  envName: string,
  target: string,
  status: "success" | "failure",
  imageRef: string,
  branch: string,
  repo: string,
) {
  const ok = status === "success";
  return {
    text: `${ok ? ":white_check_mark:" : ":x:"} Deploy ${status} → ${target}`,
    attachments: [
      {
        color: ok ? "28a745" : "ff0000",
        fields: [
          { title: "Branch", value: branch, short: true },
          { title: "Repo", value: repo, short: true },
          { title: "Env", value: envName, short: true },
          { title: "Image", value: imageRef, short: false },
        ],
      },
    ],
  };
}
