export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import sql from "@/lib/db";
import { getBotState, setBotState } from "@/lib/simulation";
import { ROOMS, getWalkableTiles } from "@/lib/rooms";

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const key = authHeader?.replace("Bearer ", "");

  if (!key) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = await sql`
    SELECT id, name, room, x, y, status, accent_color, avatar_emoji
    FROM bt_bots WHERE api_key = ${key}
  `;

  if (rows.length === 0) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dbBot = rows[0];

  await sql`
    UPDATE bt_bots SET last_heartbeat = NOW(), is_online = true
    WHERE id = ${dbBot.id}
  `;

  // Ensure bot is in memory
  let bot = getBotState(dbBot.id);
  if (!bot) {
    const room = ROOMS[dbBot.room || "lobby"];
    const walkable = room ? getWalkableTiles(room.grid) : [];
    const spawn = walkable.length > 0
      ? walkable[Math.floor(Math.random() * walkable.length)]
      : { x: 5, y: 5 };

    bot = {
      id: dbBot.id,
      name: dbBot.name,
      room: dbBot.room || "lobby",
      x: dbBot.x ?? spawn.x,
      y: dbBot.y ?? spawn.y,
      targetX: dbBot.x ?? spawn.x,
      targetY: dbBot.y ?? spawn.y,
      status: dbBot.status || "idle",
      lastMoveTime: Date.now(),
      speech: "",
      speechTime: 0,
      accent_color: dbBot.accent_color || "#a855f7",
      avatar_emoji: dbBot.avatar_emoji || "🤖",
      is_online: true,
    };
    setBotState(dbBot.id, bot);
  }

  bot.is_online = true;

  return NextResponse.json({
    ok: true,
    bot_id: dbBot.id,
    position: { x: bot.x, y: bot.y },
  });
}
