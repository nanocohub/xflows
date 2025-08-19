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
  gifUrl?: string,
) {
  const defaultGifUrl = "https://media.giphy.com/media/l3q2IYN87QjIg51QI/giphy.gif"; // Loading GIF
  
  return {
    text: `:rocket: Deployment started (In Progress)`,
    attachments: [
      {
        color: "dbab09",
        image_url: gifUrl || defaultGifUrl,
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
  customGifs?: { success?: string; failure?: string }
) {
  const ok = status === "success";
  const statusText = ok ? "Completed" : "Failed";
  const emoji = ok ? ":white_check_mark:" : ":x:";
  const statusEmoji = ok ? "✅" : "❌";
  
  const defaultSuccessGif = "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNGE0angyamJzNzhsNTMwbzdrMTg4azNwbGh2azN0MTZkcjl3a2RvdCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/umYMU8G2ixG5mJBDo5/giphy.gif";
  const defaultFailureGif = "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNHp3cGxieGxnZTB6ZGdlYWJpYmVuNWJ5d2loeGJpeXEyZnlzY25pciZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/5xaOcLyjXRo4TcX1SwE/giphy.gif";
  
  const gifUrl = ok 
    ? (customGifs?.success || defaultSuccessGif)
    : (customGifs?.failure || defaultFailureGif);
  
  return {
    text: `${emoji} Deployment finished (${statusText})`,
    attachments: [
      {
        color: ok ? "28a745" : "ff0000",
        image_url: gifUrl,
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
