"use client";

import { useState, useCallback } from "react";
import World from "@/app/components/World";
import ChatLog from "@/app/components/ChatLog";
import BotInfo from "@/app/components/BotInfo";

interface BotState {
  id: string;
  name: string;
  room: string;
  x: number;
  y: number;
  status: string;
  speech: string;
}

interface SpeechMessage {
  text: string;
  time: number;
}

export default function Home() {
  const [selectedBot, setSelectedBot] = useState<BotState | null>(null);
  const [speeches, setSpeeches] = useState<SpeechMessage[]>([]);

  const handleBotClick = useCallback((bot: BotState | null) => {
    setSelectedBot((prev) => (prev?.id === bot?.id ? null : bot));
  }, []);

  const handleSpeech = useCallback((messages: SpeechMessage[]) => {
    setSpeeches(messages);
  }, []);

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-[#0a0a0a]">
      <World onBotClick={handleBotClick} onSpeech={handleSpeech} />
      <ChatLog messages={speeches} />
      <BotInfo bot={selectedBot} onClose={() => setSelectedBot(null)} />
    </main>
  );
}
