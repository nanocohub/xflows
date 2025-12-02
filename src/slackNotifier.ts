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
  
  let headerText, branchEmoji, actorEmoji, repoEmoji, envEmoji, targetEmoji, footerText;
  
  if (december) {
    headerText = `:santa: Deployment started (In Progress) :christmas_tree:`;
    branchEmoji = "🎄";
    actorEmoji = "🤶";
    repoEmoji = "🎁";
    envEmoji = "❄️";
    targetEmoji = "⛄";
    footerText = `🎅 Deployment started 🎅`;
  } else if (newYear) {
    headerText = `:confetti_ball: Deployment started (In Progress) :sparkles:`;
    branchEmoji = "🎊";
    actorEmoji = "🥳";
    repoEmoji = "🎈";
    envEmoji = "✨";
    targetEmoji = "🎯";
    footerText = `🎉 Deployment started 🎉`;
  } else {
    headerText = `:rocket: Deployment started (In Progress)`;
    branchEmoji = "🧠";
    actorEmoji = "👤";
    repoEmoji = "📚";
    envEmoji = "🌍";
    targetEmoji = "🎯";
    footerText = `Deployment started`;
  }
  
  const message = `${headerText}

⏳ Status
In Progress
${branchEmoji} Branch
${branch}
${actorEmoji} Actor
${actor}
${repoEmoji} Repository
${repo}
${envEmoji} Environment
${envName}
${targetEmoji} Target
${target}
🔗 Run URL
${runUrl}

${footerText}`;

  return {
    text: message,
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
  
  let headerText, branchEmoji, actorEmoji, repoEmoji, envEmoji, targetEmoji, imageEmoji, footerText;
  
  if (december) {
    headerText = ok ? `:santa: Deployment finished (${statusText}) :christmas_tree:` : `:disappointed_face: Deployment finished (${statusText}) :christmas_tree:`;
    branchEmoji = "🎄";
    actorEmoji = "🤶";
    repoEmoji = "🎁";
    envEmoji = "❄️";
    targetEmoji = "⛄";
    imageEmoji = "🎀";
    footerText = `🎄 Deployment finished 🎄`;
  } else if (newYear) {
    headerText = ok ? `:tada: Deployment finished (${statusText}) :confetti_ball:` : `:disappointed_face: Deployment finished (${statusText}) :sparkles:`;
    branchEmoji = "🎊";
    actorEmoji = "🥳";
    repoEmoji = "🎈";
    envEmoji = "✨";
    targetEmoji = "🎯";
    imageEmoji = "🎁";
    footerText = `🎉 Deployment finished 🎉`;
  } else {
    headerText = `${emoji} Deployment finished (${statusText})`;
    branchEmoji = "🧠";
    actorEmoji = "👤";
    repoEmoji = "📚";
    envEmoji = "🌍";
    targetEmoji = "🎯";
    imageEmoji = "🖼️";
    footerText = `Deployment finished`;
  }
  
  const message = `${headerText}

${statusEmoji} Status
${statusText}
${branchEmoji} Branch
${branch}
${actorEmoji} Actor
${actor}
${repoEmoji} Repository
${repo}
${envEmoji} Environment
${envName}
${targetEmoji} Target
${target}
${imageEmoji} Image
${imageRef}

${footerText}`;

  return {
    text: message,
  };
}
