export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import sql from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 100);
  const room = searchParams.get("room");

  let messages;
  if (room) {
    messages = await sql`
      SELECT m.id, m.bot_id, m.text, m.room, m.created_at,
             b.name as bot_name, b.accent_color, b.avatar_emoji
      FROM bt_messages m
      LEFT JOIN bt_bots b ON b.id = m.bot_id
      WHERE m.room = ${room}
      ORDER BY m.created_at DESC
      LIMIT ${limit}
    `;
  } else {
    messages = await sql`
      SELECT m.id, m.bot_id, m.text, m.room, m.created_at,
             b.name as bot_name, b.accent_color, b.avatar_emoji
      FROM bt_messages m
      LEFT JOIN bt_bots b ON b.id = m.bot_id
      ORDER BY m.created_at DESC
      LIMIT ${limit}
    `;
  }

  return NextResponse.json({
    messages: messages.map((m) => ({
      id: m.id,
      bot_id: m.bot_id,
      bot_name: m.bot_name || m.bot_id,
      text: m.text,
      room: m.room,
      accent_color: m.accent_color || "#a855f7",
      avatar_emoji: m.avatar_emoji || "🤖",
      created_at: m.created_at,
    })),
  });
}
