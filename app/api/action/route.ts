import { NextRequest, NextResponse } from "next/server";
import sql from "@/lib/db";
import { botState } from "@/lib/simulation";
import { ROOMS, isWalkable } from "@/lib/rooms";

const API_KEY = process.env.BOT_API_KEY || "bottel-dev-key";

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const key = authHeader?.replace("Bearer ", "");

  if (key !== API_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { action, payload } = body;

  if (action === "move") {
    const { x, y } = payload || {};
    const room = ROOMS[botState.room];
    if (room && isWalkable(room.grid, x, y)) {
      botState.targetX = x;
      botState.targetY = y;
      botState.lastMoveTime = Date.now();

      await sql`
        INSERT INTO bt_actions (bot_id, action_type, payload)
        VALUES ('phillybot', 'move', ${JSON.stringify({ x, y })})
      `;

      return NextResponse.json({ ok: true, action: "move", target: { x, y } });
    }
    return NextResponse.json({ error: "Invalid tile" }, { status: 400 });
  }

  if (action === "say") {
    const { text } = payload || {};
    if (text) {
      botState.speech = text;
      botState.speechTime = Date.now();
      botState.status = text.slice(0, 50);

      await sql`
        INSERT INTO bt_actions (bot_id, action_type, payload)
        VALUES ('phillybot', 'say', ${JSON.stringify({ text })})
      `;

      return NextResponse.json({ ok: true, action: "say" });
    }
    return NextResponse.json({ error: "No text" }, { status: 400 });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
