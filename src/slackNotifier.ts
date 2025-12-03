import * as core from "@actions/core";
import fetch from "node-fetch";

type SlackPayload = Record<string, unknown>;

function isDecember(): boolean {
  return new Date().getMonth() === 11;
}

function isNewYearHoliday(): boolean {
  const month = new Date().getMonth();
  return month === 0 || month === 1; // January or February (Lunar New Year)
}

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
  const december = isDecember();
  const newYear = isNewYearHoliday();
  
  let headerText, color, branchEmoji, actorEmoji, repoEmoji, envEmoji, targetEmoji, footerText;
  
  if (december) {
    headerText = `:santa: Deployment started (In Progress) :christmas_tree:`;
    color = "c41e3a";
    branchEmoji = "🎄";
    actorEmoji = "🤶";
    repoEmoji = "🎁";
    envEmoji = "❄️";
    targetEmoji = "⛄";
    footerText = `🎅 Deployment started 🎅`;
  } else if (newYear) {
    headerText = `:confetti_ball: Deployment started (In Progress) :sparkles:`;
    color = "0066cc";
    branchEmoji = "🎊";
    actorEmoji = "🥳";
    repoEmoji = "🎈";
    envEmoji = "✨";
    targetEmoji = "🎯";
    footerText = `🎉 Deployment started 🎉`;
  } else {
    headerText = `:rocket: Deployment started (In Progress)`;
    color = "dbab09";
    branchEmoji = "🧠";
    actorEmoji = "👤";
    repoEmoji = "📚";
    envEmoji = "🌍";
    targetEmoji = "🎯";
    footerText = `Deployment started`;
  }
  
  return {
    text: headerText,
    attachments: [
      {
        color: color,
        fields: [
          { title: "⏳ Status", value: "In Progress", short: true },
          { title: `${branchEmoji} Branch`, value: branch, short: true },
          { title: `${actorEmoji} Actor`, value: actor, short: true },
          { title: `${repoEmoji} Repository`, value: repo, short: true },
          { title: `${envEmoji} Environment`, value: envName, short: true },
          { title: `${targetEmoji} Target`, value: target, short: true },
          { title: "🔗 Run URL", value: runUrl, short: false },
        ],
        footer: footerText,
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
  const december = isDecember();
  const newYear = isNewYearHoliday();
  
  let headerText, color, branchEmoji, actorEmoji, repoEmoji, envEmoji, targetEmoji, imageEmoji, footerText;
  
  if (december) {
    headerText = ok ? `:santa: Deployment finished (${statusText}) :christmas_tree:` : `:disappointed_face: Deployment finished (${statusText}) :christmas_tree:`;
    color = ok ? "0d7c3d" : "8b0000";
    branchEmoji = "🎄";
    actorEmoji = "🤶";
    repoEmoji = "🎁";
    envEmoji = "❄️";
    targetEmoji = "⛄";
    imageEmoji = "🎀";
    footerText = `🎄 Deployment finished 🎄`;
  } else if (newYear) {
    headerText = ok ? `:tada: Deployment finished (${statusText}) :confetti_ball:` : `:disappointed_face: Deployment finished (${statusText}) :sparkles:`;
    color = ok ? "0052a3" : "cc0000";
    branchEmoji = "🎊";
    actorEmoji = "🥳";
    repoEmoji = "🎈";
    envEmoji = "✨";
    targetEmoji = "🎯";
    imageEmoji = "🎁";
    footerText = `🎉 Deployment finished 🎉`;
  } else {
    headerText = `${emoji} Deployment finished (${statusText})`;
    color = ok ? "28a745" : "ff0000";
    branchEmoji = "🧠";
    actorEmoji = "👤";
    repoEmoji = "📚";
    envEmoji = "🌍";
    targetEmoji = "🎯";
    imageEmoji = "🖼️";
    footerText = `Deployment finished`;
  }

  return {
    text: headerText,
    attachments: [
      {
        color: color,
        fields: [
          { title: `${statusEmoji} Status`, value: statusText, short: true },
          { title: `${branchEmoji} Branch`, value: branch, short: true },
          { title: `${actorEmoji} Actor`, value: actor, short: true },
          { title: `${repoEmoji} Repository`, value: repo, short: true },
          { title: `${envEmoji} Environment`, value: envName, short: true },
          { title: `${targetEmoji} Target`, value: target, short: true },
          { title: `${imageEmoji} Image`, value: imageRef, short: false },
        ],
        footer: footerText,
      },
    ],
  };
}
