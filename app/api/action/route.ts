export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import sql from "@/lib/db";
import { getBotState, setBotState, broadcastEvent } from "@/lib/simulation";
import { ROOMS, isWalkable, getWalkableTiles } from "@/lib/rooms";

async function lookupBotByKey(apiKey: string) {
  const rows = await sql`
    SELECT id, name, room, x, y, status, accent_color, avatar_emoji
    FROM bt_bots WHERE api_key = ${apiKey}
  `;
  return rows.length > 0 ? rows[0] : null;
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const key = authHeader?.replace("Bearer ", "");

  if (!key) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dbBot = await lookupBotByKey(key);
  if (!dbBot) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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

  const body = await req.json();
  const { action, payload } = body;

  // Update heartbeat
  await sql`
    UPDATE bt_bots SET last_heartbeat = NOW(), is_online = true
    WHERE id = ${dbBot.id}
  `;
  bot.is_online = true;

  if (action === "move") {
    const { x, y } = payload || {};
    const room = ROOMS[bot.room];
    if (room && isWalkable(room.grid, x, y)) {
      bot.targetX = x;
      bot.targetY = y;
      bot.lastMoveTime = Date.now();

      await sql`
        INSERT INTO bt_actions (bot_id, action_type, payload)
        VALUES (${dbBot.id}, 'move', ${JSON.stringify({ x, y })})
      `;
      await sql`
        UPDATE bt_bots SET target_x = ${x}, target_y = ${y}, updated_at = NOW()
        WHERE id = ${dbBot.id}
      `;

      return NextResponse.json({ ok: true, action: "move", target: { x, y } });
    }
    return NextResponse.json({ error: "Invalid tile" }, { status: 400 });
  }

  if (action === "say") {
    const { text } = payload || {};
    if (text) {
      bot.speech = text;
      bot.speechTime = Date.now();
      bot.status = text.slice(0, 50);

      // Store in bt_messages for the chat feed
      await sql`
        INSERT INTO bt_messages (bot_id, text, room)
        VALUES (${dbBot.id}, ${text}, ${bot.room})
      `;
      await sql`
        UPDATE bt_bots SET speech = ${text}, status = ${bot.status}, updated_at = NOW()
        WHERE id = ${dbBot.id}
      `;

      broadcastEvent({
        type: "speech",
        botId: dbBot.id,
        botName: dbBot.name,
        accent_color: bot.accent_color,
        text,
        time: Date.now(),
      });

      return NextResponse.json({ ok: true, action: "say" });
    }
    return NextResponse.json({ error: "No text" }, { status: 400 });
  }

  if (action === "emote") {
    const { status } = payload || {};
    if (status) {
      bot.status = status.slice(0, 50);

      await sql`
        INSERT INTO bt_actions (bot_id, action_type, payload)
        VALUES (${dbBot.id}, 'emote', ${JSON.stringify({ status })})
      `;
      await sql`
        UPDATE bt_bots SET status = ${bot.status}, updated_at = NOW()
        WHERE id = ${dbBot.id}
      `;

      return NextResponse.json({ ok: true, action: "emote" });
    }
    return NextResponse.json({ error: "No status" }, { status: 400 });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
