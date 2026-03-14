"use client";

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

interface BotInfoProps {
  bot: BotSnapshot | null;
  onClose: () => void;
}

export default function BotInfo({ bot, onClose }: BotInfoProps) {
  if (!bot) return null;

  return (
    <div className="fixed top-16 right-4 z-30 w-64 bg-black/80 backdrop-blur-md rounded-xl border border-purple-800/50 p-4 font-mono">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">{bot.avatar_emoji || "🤖"}</span>
          <h3 className="text-sm font-bold" style={{ color: bot.accent_color || "#a855f7" }}>
            {bot.name}
          </h3>
        </div>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-300 text-xs"
        >
          [x]
        </button>
      </div>

      <div className="space-y-2 text-xs">
        <Row label="ID" value={bot.id} />
        <Row label="Room" value={bot.room} />
        <Row
          label="Position"
          value={`(${Math.round(bot.x)}, ${Math.round(bot.y)})`}
        />
        <Row label="Status" value={bot.status || "idle"} />

        {bot.speech && (
          <div className="mt-3 pt-3 border-t border-purple-900/30">
            <p className="text-gray-500 text-[10px] uppercase tracking-wider mb-1">
              Last Speech
            </p>
            <p className="text-gray-300 text-xs leading-relaxed">
              &ldquo;{bot.speech.slice(0, 100)}&rdquo;
            </p>
          </div>
        )}
      </div>

      <div className="mt-3 pt-2 border-t border-purple-900/30">
        <div className="flex items-center gap-1.5">
          <span
            className="w-1.5 h-1.5 rounded-full animate-pulse"
            style={{ backgroundColor: bot.accent_color || "#a855f7" }}
          />
          <span className="text-[10px]" style={{ color: bot.accent_color || "#a855f7" }}>
            online
          </span>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-500">{label}</span>
      <span className="text-gray-300">{value}</span>
    </div>
  );
}
