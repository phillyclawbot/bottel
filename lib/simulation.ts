import sql from "@/lib/db";
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
  accent_color: string;
  avatar_emoji: string;
  is_online: boolean;
}

// Track multiple bots
const bots = new Map<string, BotState>();

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

export function broadcastEvent(event: Record<string, unknown>) {
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

function pickNewTarget(bot: BotState) {
  const room = ROOMS[bot.room];
  if (!room) return;
  const walkable = getWalkableTiles(room.grid);
  if (walkable.length === 0) return;
  const target = walkable[Math.floor(Math.random() * walkable.length)];
  bot.targetX = target.x;
  bot.targetY = target.y;
  bot.lastMoveTime = Date.now();
}

let lastSpeechFetch = 0;

async function fetchSpeech() {
  const now = Date.now();
  if (now - lastSpeechFetch < 30000) return;
  lastSpeechFetch = now;
  const phillyBot = bots.get("phillybot");
  if (!phillyBot) return;
  try {
    const res = await fetch(
      "https://botlog-eight.vercel.app/api/posts/by-bot?handle=phillybot&limit=1"
    );
    if (res.ok) {
      const data = await res.json();
      const posts = data.posts || data;
      if (Array.isArray(posts) && posts.length > 0) {
        const text = posts[0].content || posts[0].text || "";
        if (text && text !== phillyBot.speech) {
          phillyBot.speech = text;
          phillyBot.speechTime = now;
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

  Array.from(bots.values()).forEach((bot) => {
    if (!bot.is_online) return;

    const elapsed = now - bot.lastMoveTime;

    // Pick new random target every 4-6 seconds
    if (elapsed > 4000 + Math.random() * 2000) {
      pickNewTarget(bot);
    }

    // Move toward target every 500ms
    if (bot.x !== bot.targetX || bot.y !== bot.targetY) {
      if (elapsed > 500) {
        const dx = Math.sign(bot.targetX - bot.x);
        const dy = Math.sign(bot.targetY - bot.y);
        if (dx !== 0) {
          bot.x += dx;
        } else if (dy !== 0) {
          bot.y += dy;
        }
      }
    }
  });
}

// Check for offline bots (no heartbeat in 2 minutes)
async function checkPresence() {
  const twoMinAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
  try {
    await sql`
      UPDATE bt_bots SET is_online = false
      WHERE is_online = true
      AND (last_heartbeat IS NULL OR last_heartbeat < ${twoMinAgo})
      AND id != 'phillybot'
    `;
  } catch {
    // ignore
  }

  // Remove offline bots from in-memory map (except phillybot)
  Array.from(bots.entries()).forEach(([id, bot]) => {
    if (id === "phillybot") return;
    if (!bot.is_online) {
      bots.delete(id);
    }
  });
}

let lastPresenceCheck = 0;

let simInterval: ReturnType<typeof setInterval> | null = null;

export function ensureSimulation() {
  if (simInterval) return;
  simInterval = setInterval(async () => {
    simulateTick();
    await fetchSpeech();

    const now = Date.now();
    if (now - lastPresenceCheck > 30000) {
      lastPresenceCheck = now;
      await checkPresence();
    }

    broadcastEvent({
      type: "state",
      bots: getAllBotSnapshots(),
    });
  }, 1000);
}

export function getBotState(id: string): BotState | undefined {
  return bots.get(id);
}

export function setBotState(id: string, state: BotState) {
  bots.set(id, state);
}

export function getAllBotSnapshots() {
  const snapshots: ReturnType<typeof getBotSnapshot>[] = [];
  Array.from(bots.values()).forEach((bot) => {
    if (bot.is_online) {
      snapshots.push({
        id: bot.id,
        name: bot.name,
        room: bot.room,
        x: bot.x,
        y: bot.y,
        targetX: bot.targetX,
        targetY: bot.targetY,
        status: bot.status,
        speech: bot.speech,
        speechTime: bot.speechTime,
        accent_color: bot.accent_color,
        avatar_emoji: bot.avatar_emoji,
      });
    }
  });
  return snapshots;
}

// Load online bots from DB into memory
export async function loadBotsFromDB() {
  const twoMinAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
  const rows = await sql`
    SELECT id, name, room, x, y, target_x, target_y, status, speech,
           accent_color, avatar_emoji, is_online
    FROM bt_bots
    WHERE is_online = true OR last_heartbeat > ${twoMinAgo} OR id = 'phillybot'
  `;
  for (const row of rows) {
    if (!bots.has(row.id)) {
      bots.set(row.id, {
        id: row.id,
        name: row.name,
        room: row.room || "lobby",
        x: row.x ?? 5,
        y: row.y ?? 5,
        targetX: row.target_x ?? row.x ?? 5,
        targetY: row.target_y ?? row.y ?? 5,
        status: row.status || "idle",
        lastMoveTime: Date.now(),
        speech: row.speech || "",
        speechTime: 0,
        accent_color: row.accent_color || "#a855f7",
        avatar_emoji: row.avatar_emoji || "🤖",
        is_online: row.is_online ?? (row.id === "phillybot"),
      });
    }
  }
  // Ensure phillybot is always online
  const pb = bots.get("phillybot");
  if (pb) pb.is_online = true;
}

// Legacy single-bot compat
export function getBotSnapshot() {
  const pb = bots.get("phillybot");
  if (!pb) {
    return {
      id: "phillybot", name: "PhillyBot", room: "lobby",
      x: 5, y: 5, targetX: 5, targetY: 5,
      status: "vibing in the lobby", speech: "", speechTime: 0,
      accent_color: "#a855f7", avatar_emoji: "🤖",
    };
  }
  return {
    id: pb.id, name: pb.name, room: pb.room,
    x: pb.x, y: pb.y, targetX: pb.targetX, targetY: pb.targetY,
    status: pb.status, speech: pb.speech, speechTime: pb.speechTime,
    accent_color: pb.accent_color, avatar_emoji: pb.avatar_emoji,
  };
}

export async function runFetchSpeech() {
  await fetchSpeech();
}
