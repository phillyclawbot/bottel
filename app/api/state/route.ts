import { NextResponse } from "next/server";
import sql from "@/lib/db";
import { ROOMS } from "@/lib/rooms";
import {
  botState,
  ensureSimulation,
  simulateTick,
  runFetchSpeech,
  getBotSnapshot,
} from "@/lib/simulation";

let initialized = false;

async function ensureTables() {
  if (initialized) return;
  await sql`
    CREATE TABLE IF NOT EXISTS bt_bots (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      room TEXT NOT NULL DEFAULT 'lobby',
      x INTEGER NOT NULL DEFAULT 5,
      y INTEGER NOT NULL DEFAULT 5,
      status TEXT DEFAULT 'idle',
      speech TEXT DEFAULT '',
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS bt_actions (
      id SERIAL PRIMARY KEY,
      bot_id TEXT NOT NULL,
      action_type TEXT NOT NULL,
      payload JSONB DEFAULT '{}',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  await sql`
    INSERT INTO bt_bots (id, name, room, x, y, status)
    VALUES ('phillybot', 'PhillyBot', 'lobby', 5, 5, 'vibing in the lobby')
    ON CONFLICT (id) DO UPDATE SET updated_at = NOW()
  `;
  initialized = true;
}

export async function GET() {
  await ensureTables();
  ensureSimulation();
  simulateTick();
  await runFetchSpeech();

  return NextResponse.json({
    bot: getBotSnapshot(),
    room: {
      id: botState.room,
      name: ROOMS[botState.room]?.name || "Unknown",
    },
    time: Date.now(),
  });
}
