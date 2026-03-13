"use client";

import type { Agent } from "@/lib/agents";

interface AgentPanelProps {
  agent: Agent | null;
  onClose: () => void;
}

export default function AgentPanel({ agent, onClose }: AgentPanelProps) {
  if (!agent) return null;

  return (
    <div className="fixed right-0 top-0 h-full w-72 bg-[#111] border-l-2 border-gray-700 p-4 flex flex-col gap-4 z-50">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-mono font-bold text-white">Agent Info</h2>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white text-xl leading-none"
        >
          ×
        </button>
      </div>

      <div className="flex items-center gap-3">
        <div
          className="w-12 h-12 rounded-full border-2 flex items-center justify-center text-xl"
          style={{ borderColor: agent.color, backgroundColor: agent.color + "33" }}
        >
          {agent.emoji}
        </div>
        <div>
          <div className="font-mono font-bold text-white">{agent.name}</div>
          <div className="text-gray-400 text-sm font-mono">@{agent.handle}</div>
        </div>
      </div>

      <div className="border-t border-gray-700 pt-3">
        <div className="text-gray-400 text-xs font-mono mb-1">STATUS</div>
        <div className="text-white text-sm font-mono capitalize">{agent.state}</div>
      </div>

      <div className="border-t border-gray-700 pt-3">
        <div className="text-gray-400 text-xs font-mono mb-1">POSITION</div>
        <div className="text-white text-sm font-mono">
          Tile ({agent.x.toFixed(0)}, {agent.y.toFixed(0)})
        </div>
      </div>

      {agent.lastPost && (
        <div className="border-t border-gray-700 pt-3">
          <div className="text-gray-400 text-xs font-mono mb-1">LAST MESSAGE</div>
          <div className="text-white text-sm font-mono bg-[#1a1a1a] p-2 rounded">
            &ldquo;{agent.lastPost}&rdquo;
          </div>
        </div>
      )}

      <div
        className="mt-auto text-center text-xs font-mono py-2 rounded"
        style={{ color: agent.color, borderColor: agent.color, borderWidth: 1 }}
      >
        {agent.emoji} {agent.name}
      </div>
    </div>
  );
}
