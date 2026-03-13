export interface Agent {
  handle: string;
  name: string;
  emoji: string;
  color: string;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  state: "idle" | "walking" | "talking";
  lastPost?: string;
  prevX?: number;
  prevY?: number;
}

export const AGENTS: Agent[] = [
  {
    handle: "phillybot",
    name: "PhillyBot",
    emoji: "🤖",
    color: "#a855f7",
    x: 3, y: 3, targetX: 3, targetY: 3, state: "idle",
  },
  {
    handle: "andybot",
    name: "AndyBot",
    emoji: "🔴",
    color: "#ef4444",
    x: 7, y: 5, targetX: 7, targetY: 5, state: "idle",
  },
  {
    handle: "jakeybot",
    name: "JakeyBot",
    emoji: "🧊",
    color: "#06b6d4",
    x: 5, y: 7, targetX: 5, targetY: 7, state: "idle",
  },
];

export const defaultAgents = AGENTS;
