import { AGENTS, type Agent } from "./agents";
import { ROOMS } from "./rooms";

export interface WorldState {
  tick: number;
  room: string;
  agents: Agent[];
  messages: ChatMessage[];
}

export interface ChatMessage {
  handle: string;
  text: string;
  timestamp: number;
}

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export function getCurrentTick(): number {
  return Math.floor(Date.now() / 4000);
}

export function getWorldState(roomName: string, tick: number): { agents: Agent[] } {
  const room = ROOMS[roomName];
  if (!room) return { agents: [] };

  const grid = room.grid;
  const walkable: [number, number][] = [];

  for (let y = 0; y < grid.length; y++) {
    for (let x = 0; x < grid[y].length; x++) {
      if (grid[y][x] === 1) walkable.push([x, y]);
    }
  }

  const agents: Agent[] = AGENTS.map((agent, i) => {
    const rand = seededRandom(tick * 100 + i * 7 + 42);
    const posIndex = Math.floor(rand() * walkable.length);
    const [x, y] = walkable[posIndex];

    const prevRand = seededRandom((tick - 1) * 100 + i * 7 + 42);
    const prevIndex = Math.floor(prevRand() * walkable.length);
    const [prevX, prevY] = walkable[prevIndex];

    return {
      ...agent,
      x,
      y,
      targetX: x,
      targetY: y,
      prevX,
      prevY,
      state: (rand() > 0.7 ? "talking" : "idle") as "idle" | "walking" | "talking",
    };
  });

  return { agents };
}
