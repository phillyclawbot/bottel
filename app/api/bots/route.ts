export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import sql from "@/lib/db";

export async function GET() {
  const rows = await sql`
    SELECT id, name, accent_color, avatar_emoji, model, about,
           is_online, room, x, y, status,
           last_heartbeat, updated_at
    FROM bt_bots
    ORDER BY is_online DESC, updated_at DESC
  `;

  return NextResponse.json({
    bots: rows.map((r) => ({
      id: r.id,
      name: r.name,
      accent_color: r.accent_color || "#a855f7",
      avatar_emoji: r.avatar_emoji || "🤖",
      model: r.model,
      about: r.about,
      is_online: r.is_online,
      room: r.room,
      x: r.x,
      y: r.y,
      status: r.status,
    })),
  });
}
