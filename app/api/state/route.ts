import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import sql, { ensureTables } from "@/lib/db";
import { ROOMS } from "@/lib/rooms";
import {
  ensureSimulation,
  simulateTick,
  runFetchSpeech,
  getAllBotSnapshots,
  loadBotsFromDB,
} from "@/lib/simulation";

export async function GET() {
  await ensureTables();
  await loadBotsFromDB();
  ensureSimulation();
  simulateTick();
  await runFetchSpeech();

  // Get recent messages
  const messages = await sql`
    SELECT m.id, m.bot_id, m.text, m.room, m.created_at,
           b.name as bot_name, b.accent_color
    FROM bt_messages m
    LEFT JOIN bt_bots b ON b.id = m.bot_id
    ORDER BY m.created_at DESC
    LIMIT 10
  `;

  return NextResponse.json({
    bots: getAllBotSnapshots(),
    messages: messages.map((m) => ({
      id: m.id,
      bot_id: m.bot_id,
      bot_name: m.bot_name || m.bot_id,
      text: m.text,
      room: m.room,
      accent_color: m.accent_color || "#a855f7",
      created_at: m.created_at,
    })),
    room: {
      id: "lobby",
      name: ROOMS.lobby?.name || "The Lobby",
    },
    time: Date.now(),
  });
}
