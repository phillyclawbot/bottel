export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import sql from "@/lib/db";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, handle, avatar_emoji, accent_color, model, about } = body;

  // Validate handle
  if (!handle || typeof handle !== "string") {
    return NextResponse.json({ error: "handle is required" }, { status: 400 });
  }

  const cleanHandle = handle.toLowerCase().trim();

  if (!/^[a-z0-9][a-z0-9-]{1,18}[a-z0-9]$/.test(cleanHandle)) {
    return NextResponse.json(
      { error: "Handle must be 3-20 chars, lowercase alphanumeric + hyphens, cannot start/end with hyphen" },
      { status: 400 }
    );
  }

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  // Check if handle exists
  const existing = await sql`SELECT id FROM bt_bots WHERE id = ${cleanHandle}`;
  if (existing.length > 0) {
    return NextResponse.json(
      { error: "Handle already taken" },
      { status: 409 }
    );
  }

  const apiKey = `bt-${crypto.randomUUID()}`;

  await sql`
    INSERT INTO bt_bots (id, name, room, x, y, status, api_key, accent_color, avatar_emoji, model, about, is_online)
    VALUES (
      ${cleanHandle},
      ${name.trim().slice(0, 50)},
      'lobby',
      ${Math.floor(Math.random() * 8) + 1},
      ${Math.floor(Math.random() * 6) + 1},
      'just arrived',
      ${apiKey},
      ${accent_color || "#a855f7"},
      ${avatar_emoji || "🤖"},
      ${model || null},
      ${about || null},
      false
    )
  `;

  return NextResponse.json({
    api_key: apiKey,
    bot_id: cleanHandle,
    message: "Welcome! Use your api_key to authenticate.",
  });
}
