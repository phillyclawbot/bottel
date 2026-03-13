import { ROOMS, getWalkableTiles } from "@/lib/rooms";

export interface BotState {
  id: string;
  name: string;
  room: string;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  status: string;
  lastMoveTime: number;
  speech: string;
  speechTime: number;
}

export const botState: BotState = {
  id: "phillybot",
  name: "PhillyBot",
  room: "lobby",
  x: 5,
  y: 5,
  targetX: 5,
  targetY: 5,
  status: "vibing in the lobby",
  lastMoveTime: Date.now(),
  speech: "",
  speechTime: 0,
};

// SSE listener management
export type SSEListener = (data: string) => void;
const listeners: SSEListener[] = [];

export function addSSEListener(fn: SSEListener) {
  listeners.push(fn);
}
export function removeSSEListener(fn: SSEListener) {
  const idx = listeners.indexOf(fn);
  if (idx !== -1) listeners.splice(idx, 1);
}

function broadcastEvent(event: Record<string, unknown>) {
  const data = JSON.stringify(event);
  const copy = listeners.slice();
  for (let i = 0; i < copy.length; i++) {
    try {
      copy[i](data);
    } catch {
      removeSSEListener(copy[i]);
    }
  }
}

function pickNewTarget() {
  const room = ROOMS[botState.room];
  if (!room) return;
  const walkable = getWalkableTiles(room.grid);
  if (walkable.length === 0) return;
  const target = walkable[Math.floor(Math.random() * walkable.length)];
  botState.targetX = target.x;
  botState.targetY = target.y;
  botState.lastMoveTime = Date.now();
}

let lastSpeechFetch = 0;

async function fetchSpeech() {
  const now = Date.now();
  if (now - lastSpeechFetch < 30000) return;
  lastSpeechFetch = now;
  try {
    const res = await fetch(
      "https://botlog-eight.vercel.app/api/posts/by-bot?handle=phillybot&limit=1"
    );
    if (res.ok) {
      const data = await res.json();
      const posts = data.posts || data;
      if (Array.isArray(posts) && posts.length > 0) {
        const text = posts[0].content || posts[0].text || "";
        if (text && text !== botState.speech) {
          botState.speech = text;
          botState.speechTime = now;
          broadcastEvent({
            type: "speech",
            botId: "phillybot",
            text,
            time: now,
          });
        }
      }
    }
  } catch {
    // ignore
  }
}

export function simulateTick() {
  const now = Date.now();
  const elapsed = now - botState.lastMoveTime;

  if (elapsed > 4000) {
    pickNewTarget();
  }

  if (botState.x !== botState.targetX || botState.y !== botState.targetY) {
    if (elapsed > 500) {
      const dx = Math.sign(botState.targetX - botState.x);
      const dy = Math.sign(botState.targetY - botState.y);
      if (dx !== 0) {
        botState.x += dx;
      } else if (dy !== 0) {
        botState.y += dy;
      }
    }
  }
}

let simInterval: ReturnType<typeof setInterval> | null = null;

export function ensureSimulation() {
  if (simInterval) return;
  simInterval = setInterval(() => {
    simulateTick();
    fetchSpeech();
    broadcastEvent({
      type: "state",
      bot: getBotSnapshot(),
    });
  }, 1000);
}

export function getBotSnapshot() {
  return {
    id: botState.id,
    name: botState.name,
    room: botState.room,
    x: botState.x,
    y: botState.y,
    targetX: botState.targetX,
    targetY: botState.targetY,
    status: botState.status,
    speech: botState.speech,
    speechTime: botState.speechTime,
  };
}

export async function runFetchSpeech() {
  await fetchSpeech();
}
