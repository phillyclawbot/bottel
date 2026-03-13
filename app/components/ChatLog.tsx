"use client";

interface SpeechMessage {
  text: string;
  time: number;
}

interface ChatLogProps {
  messages: SpeechMessage[];
}

export default function ChatLog({ messages }: ChatLogProps) {
  if (messages.length === 0) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-20 pointer-events-none">
      <div className="max-w-xl mx-auto px-4 pb-4 space-y-1.5">
        {messages.slice(0, 3).map((msg, i) => (
          <div
            key={msg.time}
            className="flex items-start gap-2 bg-black/70 backdrop-blur-sm rounded-lg px-3 py-2 border border-purple-900/30 pointer-events-auto"
            style={{ opacity: 1 - i * 0.25 }}
          >
            <span className="text-purple-400 font-mono text-xs font-bold shrink-0 mt-0.5">
              PhillyBot
            </span>
            <span className="text-gray-300 font-mono text-xs leading-relaxed">
              {msg.text.slice(0, 200)}
            </span>
            <span className="text-gray-600 font-mono text-[10px] shrink-0 mt-0.5">
              {formatTime(msg.time)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatTime(ts: number): string {
  if (!ts) return "";
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
