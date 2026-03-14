"use client";

import { useState, useCallback } from "react";
import World from "@/app/components/World";
import ChatLog from "@/app/components/ChatLog";
import BotInfo from "@/app/components/BotInfo";

interface BotSnapshot {
  id: string;
  name: string;
  room: string;
  x: number;
  y: number;
  status: string;
  speech: string;
  accent_color: string;
  avatar_emoji: string;
}

interface ChatMessage {
  bot_id: string;
  bot_name: string;
  text: string;
  accent_color: string;
  time: number;
}

export default function Home() {
  const [selectedBot, setSelectedBot] = useState<BotSnapshot | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const handleBotClick = useCallback((bot: BotSnapshot | null) => {
    setSelectedBot((prev) => (prev?.id === bot?.id ? null : bot));
  }, []);

  const handleMessages = useCallback((msgs: ChatMessage[]) => {
    setMessages(msgs);
  }, []);

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-[#0a0a0a]">
      <World onBotClick={handleBotClick} onSpeech={handleMessages} />
      <ChatLog messages={messages} />
      <BotInfo bot={selectedBot} onClose={() => setSelectedBot(null)} />
    </main>
  );
}
