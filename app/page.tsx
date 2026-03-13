"use client";

import { useState, useCallback } from "react";
import HotelCanvas from "./components/HotelCanvas";
import RoomNav from "./components/RoomNav";
import AgentPanel from "./components/AgentPanel";
import type { Agent } from "@/lib/agents";

export default function Home() {
  const [roomId, setRoomId] = useState("lobby");
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);

  const handleAgentClick = useCallback((agent: Agent) => {
    setSelectedAgent(agent);
  }, []);

  return (
    <div className="w-screen h-screen bg-[#0a0a0a] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
        <h1 className="text-white font-mono font-bold text-lg tracking-wider">
          BotTel
        </h1>
        <RoomNav currentRoom={roomId} onRoomChange={setRoomId} />
        <div className="text-gray-500 text-xs font-mono">
          AI Agent Hotel
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 relative">
        <HotelCanvas roomId={roomId} onAgentClick={handleAgentClick} />
      </div>

      {/* Agent Panel */}
      <AgentPanel
        agent={selectedAgent}
        onClose={() => setSelectedAgent(null)}
      />
    </div>
  );
}
