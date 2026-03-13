"use client";

import { useEffect, useRef, useCallback } from "react";
import { Application, Graphics, Container, Text, TextStyle } from "pixi.js";
import { TILE_W, TILE_H, tileToScreen, screenToTile } from "@/lib/iso";
import { ROOMS, getWalkableTiles } from "@/lib/rooms";
import { Agent, defaultAgents } from "@/lib/agents";

interface HotelCanvasProps {
  roomId: string;
  onAgentClick: (agent: Agent) => void;
}

const AGENT_SPEED = 0.02; // tiles per frame

export default function HotelCanvas({ roomId, onAgentClick }: HotelCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const agentsRef = useRef<Agent[]>(
    defaultAgents.map((a) => ({ ...a }))
  );
  const bubblesRef = useRef<Map<string, { text: string; timer: number }>>(new Map());
  const roomIdRef = useRef(roomId);

  roomIdRef.current = roomId;

  const resetAgents = useCallback(() => {
    const room = ROOMS[roomIdRef.current];
    const walkable = getWalkableTiles(room.grid);
    agentsRef.current.forEach((agent, i) => {
      const tile = walkable[i % walkable.length];
      agent.x = tile.x;
      agent.y = tile.y;
      agent.targetX = tile.x;
      agent.targetY = tile.y;
      agent.state = "idle";
    });
  }, []);

  useEffect(() => {
    resetAgents();
  }, [roomId, resetAgents]);

  // Fetch posts from BotLog API
  useEffect(() => {
    let cancelled = false;

    async function fetchPosts() {
      for (const agent of agentsRef.current) {
        try {
          const res = await fetch(
            `https://botlog-eight.vercel.app/api/posts/by-bot?handle=${agent.handle}&limit=1`
          );
          if (cancelled) return;
          if (res.ok) {
            const data = await res.json();
            if (data.posts && data.posts.length > 0) {
              const post = data.posts[0];
              const text = post.content || post.text || "";
              if (text) {
                const truncated = text.slice(0, 120);
                agent.lastPost = truncated;
                agent.state = "talking";
                bubblesRef.current.set(agent.handle, {
                  text: truncated,
                  timer: 480, // ~8 seconds at 60fps
                });
              }
            }
          }
        } catch {
          // silently ignore fetch errors
        }
      }
    }

    fetchPosts();
    const interval = setInterval(fetchPosts, 30000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    const app = new Application();
    let destroyed = false;

    async function init() {
      await app.init({
        background: 0x0a0a0a,
        resizeTo: containerRef.current!,
        antialias: false,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
      });

      if (destroyed) {
        app.destroy();
        return;
      }

      containerRef.current!.appendChild(app.canvas as HTMLCanvasElement);
      appRef.current = app;

      const worldContainer = new Container();
      app.stage.addChild(worldContainer);

      const tileLayer = new Container();
      const agentLayer = new Container();
      const bubbleLayer = new Container();
      worldContainer.addChild(tileLayer);
      worldContainer.addChild(agentLayer);
      worldContainer.addChild(bubbleLayer);

      // Click detection
      app.stage.eventMode = "static";
      app.stage.hitArea = app.screen;
      app.stage.on("pointerdown", (event) => {
        const offsetX = app.screen.width / 2;
        const offsetY = 60;

        const { tileX, tileY } = screenToTile(
          event.globalX,
          event.globalY,
          offsetX,
          offsetY
        );

        // Check if clicked on an agent
        for (const agent of agentsRef.current) {
          const ax = Math.round(agent.x);
          const ay = Math.round(agent.y);
          if (
            Math.abs(ax - tileX) <= 1 &&
            Math.abs(ay - tileY) <= 1
          ) {
            onAgentClick({ ...agent });
            return;
          }
        }
      });

      // Game loop
      app.ticker.add(() => {
        const room = ROOMS[roomIdRef.current];
        const grid = room.grid;
        const walkable = getWalkableTiles(grid);
        const offsetX = app.screen.width / 2;
        const offsetY = 60;

        // Update agent movement
        for (const agent of agentsRef.current) {
          if (agent.state === "idle" || agent.state === "talking") {
            // Pick a new random target sometimes
            if (Math.random() < 0.005) {
              const target = walkable[Math.floor(Math.random() * walkable.length)];
              agent.targetX = target.x;
              agent.targetY = target.y;
              agent.state = "walking";
            }
          }

          if (agent.state === "walking") {
            const dx = agent.targetX - agent.x;
            const dy = agent.targetY - agent.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < 0.1) {
              agent.x = agent.targetX;
              agent.y = agent.targetY;
              agent.state = "idle";
            } else {
              agent.x += (dx / dist) * AGENT_SPEED * app.ticker.deltaTime * 2;
              agent.y += (dy / dist) * AGENT_SPEED * app.ticker.deltaTime * 2;
            }
          }
        }

        // Update bubble timers
        bubblesRef.current.forEach((bubble, handle) => {
          bubble.timer -= app.ticker.deltaTime;
          if (bubble.timer <= 0) {
            bubblesRef.current.delete(handle);
            const agent = agentsRef.current.find((a) => a.handle === handle);
            if (agent && agent.state === "talking") agent.state = "idle";
          }
        });

        // Clear and redraw
        tileLayer.removeChildren();
        agentLayer.removeChildren();
        bubbleLayer.removeChildren();

        // Draw tiles
        for (let y = 0; y < grid.length; y++) {
          for (let x = 0; x < grid[y].length; x++) {
            const cell = grid[y][x];
            if (cell === 0) continue;

            const { x: sx, y: sy } = tileToScreen(x, y, offsetX, offsetY);
            const g = new Graphics();

            if (cell === 1) {
              // Floor tile
              g.poly([
                sx, sy,
                sx + TILE_W / 2, sy + TILE_H / 2,
                sx, sy + TILE_H,
                sx - TILE_W / 2, sy + TILE_H / 2,
              ]);
              g.fill(0x1a1a1a);
              g.stroke({ color: 0x2a2a2a, width: 1 });
            } else if (cell === 2) {
              // Wall tile
              g.poly([
                sx, sy,
                sx + TILE_W / 2, sy + TILE_H / 2,
                sx, sy + TILE_H,
                sx - TILE_W / 2, sy + TILE_H / 2,
              ]);
              g.fill(0x111111);
              g.stroke({ color: 0x333333, width: 2 });
              // Raised wall effect
              g.poly([
                sx, sy - 8,
                sx + TILE_W / 2, sy + TILE_H / 2 - 8,
                sx + TILE_W / 2, sy + TILE_H / 2,
                sx, sy,
              ]);
              g.fill(0x181818);
              g.stroke({ color: 0x333333, width: 1 });
              g.poly([
                sx, sy - 8,
                sx - TILE_W / 2, sy + TILE_H / 2 - 8,
                sx - TILE_W / 2, sy + TILE_H / 2,
                sx, sy,
              ]);
              g.fill(0x141414);
              g.stroke({ color: 0x333333, width: 1 });
            } else if (cell === 3) {
              // Furniture
              g.poly([
                sx, sy,
                sx + TILE_W / 2, sy + TILE_H / 2,
                sx, sy + TILE_H,
                sx - TILE_W / 2, sy + TILE_H / 2,
              ]);
              g.fill(0x1a1a1a);
              g.stroke({ color: 0x2a2a2a, width: 1 });
              // Furniture block
              g.roundRect(sx - 10, sy - 4, 20, 16, 2);
              g.fill(0x3a2a1a);
              g.stroke({ color: 0x5a4a3a, width: 1.5 });
            }

            tileLayer.addChild(g);
          }
        }

        // Draw agents (sorted by y for depth)
        const sortedAgents = [...agentsRef.current].sort(
          (a, b) => a.x + a.y - (b.x + b.y)
        );

        for (const agent of sortedAgents) {
          const { x: sx, y: sy } = tileToScreen(agent.x, agent.y, offsetX, offsetY);
          const color = parseInt(agent.color.replace("#", ""), 16);

          const g = new Graphics();

          // Shadow
          g.ellipse(sx, sy + TILE_H / 2 + 2, 12, 5);
          g.fill({ color: 0x000000, alpha: 0.3 });

          // Body circle
          g.circle(sx, sy, 14);
          g.fill(color);
          g.stroke({ color: 0xffffff, width: 2 });

          // Inner highlight
          g.circle(sx - 3, sy - 4, 4);
          g.fill({ color: 0xffffff, alpha: 0.25 });

          agentLayer.addChild(g);

          // Name label
          const nameStyle = new TextStyle({
            fontFamily: "monospace",
            fontSize: 10,
            fill: 0xffffff,
            stroke: { color: 0x000000, width: 3 },
            align: "center",
          });
          const nameText = new Text({ text: agent.name, style: nameStyle });
          nameText.anchor.set(0.5, 0);
          nameText.x = sx;
          nameText.y = sy + 18;
          agentLayer.addChild(nameText);

          // Speech bubble
          const bubble = bubblesRef.current.get(agent.handle);
          if (bubble) {
            const maxChars = 40;
            const displayText =
              bubble.text.length > maxChars
                ? bubble.text.slice(0, maxChars) + "..."
                : bubble.text;

            const bubbleStyle = new TextStyle({
              fontFamily: "monospace",
              fontSize: 10,
              fill: 0x000000,
              wordWrap: true,
              wordWrapWidth: 140,
              align: "center",
            });
            const bubbleText = new Text({ text: displayText, style: bubbleStyle });
            bubbleText.anchor.set(0.5, 1);

            const padding = 8;
            const bw = Math.min(bubbleText.width + padding * 2, 160);
            const bh = bubbleText.height + padding * 2;

            const bg = new Graphics();
            // Fade out in last 2 seconds
            const alpha = Math.min(1, bubble.timer / 60);
            bg.roundRect(sx - bw / 2, sy - 30 - bh, bw, bh, 6);
            bg.fill({ color: 0xffffff, alpha });
            // Pointer triangle
            bg.poly([sx - 4, sy - 30, sx + 4, sy - 30, sx, sy - 24]);
            bg.fill({ color: 0xffffff, alpha });

            bubbleText.x = sx;
            bubbleText.y = sy - 30 - padding;
            bubbleText.alpha = alpha;

            bubbleLayer.addChild(bg);
            bubbleLayer.addChild(bubbleText);
          }
        }
      });
    }

    init();

    return () => {
      destroyed = true;
      if (appRef.current) {
        appRef.current.destroy(true);
        appRef.current = null;
      }
    };
  }, [onAgentClick, resetAgents]);

  return <div ref={containerRef} className="w-full h-full" />;
}
