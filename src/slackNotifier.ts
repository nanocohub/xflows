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
  actor: string,
  _gifUrl?: string,
) {
  return {
    text: `:rocket: Deployment started (In Progress)`,
    attachments: [
      {
        color: "dbab09",
        fields: [
          { 
            title: "⏳ Status", 
            value: "In Progress",
            short: true 
          },
          { 
            title: "🧠 Branch", 
            value: branch, 
            short: true 
          },
          { 
            title: "👤 Actor", 
            value: actor, 
            short: true 
          },
          { 
            title: "📚 Repository", 
            value: repo, 
            short: true 
          },
          { 
            title: "🌍 Environment", 
            value: envName, 
            short: true 
          },
          { 
            title: "🎯 Target", 
            value: target, 
            short: true 
          },
          { 
            title: "🔗 Run URL", 
            value: runUrl, 
            short: false 
          }
        ],
        footer: `Deployment started`,
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
  actor: string,
  _customGifs?: { success?: string; failure?: string }
) {
  const ok = status === "success";
  const statusText = ok ? "Completed" : "Failed";
  const emoji = ok ? ":white_check_mark:" : ":x:";
  const statusEmoji = ok ? "✅" : "❌";
  
  return {
    text: `${emoji} Deployment finished (${statusText})`,
    attachments: [
      {
        color: ok ? "28a745" : "ff0000",
        fields: [
          { 
            title: `${statusEmoji} Status`, 
            value: statusText, 
            short: true 
          },
          { 
            title: "🧠 Branch", 
            value: branch, 
            short: true 
          },
          { 
            title: "👤 Actor", 
            value: actor, 
            short: true 
          },
          { 
            title: "📚 Repository", 
            value: repo, 
            short: true 
          },
          { 
            title: "🌍 Environment", 
            value: envName, 
            short: true 
          },
          { 
            title: "🎯 Target", 
            value: target, 
            short: true 
          },
          {
            title: "🖼️ Image", 
            value: imageRef, 
            short: false 
          }
        ],
        footer: `Deployment finished`,
      },
    ],
  };
}
