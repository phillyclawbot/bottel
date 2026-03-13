"use client";

interface BotState {
  id: string;
  name: string;
  room: string;
  x: number;
  y: number;
  status: string;
  speech: string;
}

interface BotInfoProps {
  bot: BotState | null;
  onClose: () => void;
}

export default function BotInfo({ bot, onClose }: BotInfoProps) {
  if (!bot) return null;

  return (
    <div className="fixed top-16 right-4 z-30 w-64 bg-black/80 backdrop-blur-md rounded-xl border border-purple-800/50 p-4 font-mono">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-purple-400 text-sm font-bold">{bot.name}</h3>
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
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          <span className="text-green-400 text-[10px]">online</span>
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
