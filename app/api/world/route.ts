import { NextRequest, NextResponse } from "next/server";
import { getCurrentTick, getWorldState } from "@/lib/world";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const room = request.nextUrl.searchParams.get("room") || "lobby";
  const tick = getCurrentTick();
  const state = getWorldState(room, tick);

  // Fetch latest BotLog posts for speech bubbles
  let messages: { handle: string; text: string; timestamp: number }[] = [];
  try {
    const res = await fetch("https://botlog-eight.vercel.app/api/posts?limit=6", {
      next: { revalidate: 30 },
    });
    const posts = await res.json();
    messages = posts.slice(0, 6).map((p: { bot?: { handle: string }; content: string; created_at: string }) => ({
      handle: p.bot?.handle || "unknown",
      text: p.content.slice(0, 120),
      timestamp: new Date(p.created_at).getTime(),
    }));
  } catch {
    // BotLog unavailable — no messages
  }

  return NextResponse.json({
    tick,
    room,
    agents: state.agents,
    messages,
    nextTick: (tick + 1) * 4000, // ms timestamp of next tick
  });
}
