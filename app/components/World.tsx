"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Application, Container, Graphics, Text, TextStyle } from "pixi.js";
import { TILE_W, TILE_H, tileToScreen } from "@/lib/iso";
import { ROOMS } from "@/lib/rooms";
import {
  drawDiamondTile,
  drawWallBlock,
  drawFurnitureBlock,
  drawPhillyBot,
} from "@/lib/pixel";

interface BotSnapshot {
  id: string;
  name: string;
  room: string;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  status: string;
  speech: string;
  speechTime: number;
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

interface WorldProps {
  onBotClick: (bot: BotSnapshot | null) => void;
  onSpeech: (messages: ChatMessage[]) => void;
}

// Furniture color palette
const FURNITURE_COLORS = [0x8b5e3c, 0x6b8e23, 0xcd853f, 0x2e8b57];

function hexToNumber(hex: string): number {
  return parseInt(hex.replace("#", ""), 16);
}

export default function World({ onBotClick, onSpeech }: WorldProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const botsRef = useRef<Map<string, BotSnapshot>>(new Map());
  const renderBotsRef = useRef<Map<string, { x: number; y: number }>>(new Map());
  const messagesRef = useRef<ChatMessage[]>([]);
  const [connected, setConnected] = useState(false);
  const [botCount, setBotCount] = useState(0);

  const getOffset = useCallback(() => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    return { offsetX: w / 2, offsetY: h / 3 };
  }, []);

  useEffect(() => {
    if (!canvasRef.current) return;

    let destroyed = false;
    const app = new Application();
    appRef.current = app;

    // Track per-bot pixi objects
    const botContainers = new Map<string, {
      container: Container;
      body: Graphics;
      nameText: Text;
      statusText: Text;
      speechContainer: Container;
      bounce: number;
      speechVisible: boolean;
    }>();

    const init = async () => {
      await app.init({
        background: 0x0a0a0a,
        resizeTo: window,
        antialias: false,
        resolution: 1,
      });

      if (destroyed) return;
      canvasRef.current!.appendChild(app.canvas);

      // Containers
      const worldContainer = new Container();
      const floorContainer = new Container();
      const wallContainer = new Container();
      const furnitureContainer = new Container();
      const botLayer = new Container();
      const uiContainer = new Container();

      worldContainer.addChild(floorContainer);
      worldContainer.addChild(wallContainer);
      worldContainer.addChild(furnitureContainer);
      worldContainer.addChild(botLayer);
      worldContainer.addChild(uiContainer);
      app.stage.addChild(worldContainer);

      const room = ROOMS.lobby;
      const { offsetX, offsetY } = getOffset();

      // Draw floor tiles
      for (let y = 0; y < room.grid.length; y++) {
        for (let x = 0; x < room.grid[y].length; x++) {
          const cell = room.grid[y][x];
          if (cell === 0) continue;

          const pos = tileToScreen(x, y, offsetX, offsetY);

          if (cell === 1) {
            const g = new Graphics();
            const shade = (x + y) % 2 === 0 ? 0x2a2035 : 0x252030;
            drawDiamondTile(g, TILE_W, TILE_H, shade);
            g.position.set(pos.x, pos.y);
            floorContainer.addChild(g);

            if ((x + y) % 3 === 0) {
              const dot = new Graphics();
              dot.circle(0, 0, 1);
              dot.fill({ color: 0x3a3045, alpha: 0.5 });
              dot.position.set(pos.x + (Math.random() - 0.5) * 8, pos.y + (Math.random() - 0.5) * 4);
              floorContainer.addChild(dot);
            }
          } else if (cell === 2) {
            const fg = new Graphics();
            drawDiamondTile(fg, TILE_W, TILE_H, 0x1a1520);
            fg.position.set(pos.x, pos.y);
            floorContainer.addChild(fg);

            const g = new Graphics();
            drawWallBlock(g, TILE_W, TILE_H, 20, 0x3d2a50);
            g.position.set(pos.x, pos.y - 10);
            wallContainer.addChild(g);
          } else if (cell === 3) {
            const fg = new Graphics();
            drawDiamondTile(fg, TILE_W, TILE_H, 0x2a2035);
            fg.position.set(pos.x, pos.y);
            floorContainer.addChild(fg);

            const g = new Graphics();
            const colorIdx = (x * 7 + y * 3) % FURNITURE_COLORS.length;
            drawFurnitureBlock(g, TILE_W * 0.7, TILE_H * 0.7, 12, FURNITURE_COLORS[colorIdx]);
            g.position.set(pos.x, pos.y - 6);
            furnitureContainer.addChild(g);
          }
        }
      }

      function ensureBotGfx(bot: BotSnapshot) {
        if (botContainers.has(bot.id)) return botContainers.get(bot.id)!;

        const container = new Container();
        const body = new Graphics();

        if (bot.id === "phillybot") {
          // PhillyBot gets pixel art
          drawPhillyBot(body, 2);
        } else {
          // Other bots: colored circle with emoji
          const color = hexToNumber(bot.accent_color || "#a855f7");
          body.circle(0, 0, 12);
          body.fill({ color, alpha: 0.9 });
          body.stroke({ color: 0xffffff, width: 1.5, alpha: 0.6 });

          // Emoji text on top
          const emojiStyle = new TextStyle({
            fontSize: 14,
            align: "center",
          });
          const emojiText = new Text({ text: bot.avatar_emoji || "🤖", style: emojiStyle });
          emojiText.anchor.set(0.5, 0.5);
          emojiText.position.set(0, -1);
          container.addChild(emojiText);
        }
        container.addChild(body);

        // Name label
        const nameColor = hexToNumber(bot.accent_color || "#a855f7");
        const nameStyle = new TextStyle({
          fontFamily: "monospace",
          fontSize: 10,
          fill: nameColor,
          align: "center",
        });
        const nameText = new Text({ text: bot.name, style: nameStyle });
        nameText.anchor.set(0.5, 0);
        nameText.position.set(0, 16);
        container.addChild(nameText);

        // Status text
        const statusStyle = new TextStyle({
          fontFamily: "monospace",
          fontSize: 8,
          fill: 0x888888,
          align: "center",
        });
        const statusText = new Text({ text: "", style: statusStyle });
        statusText.anchor.set(0.5, 1);
        statusText.position.set(0, -38);
        container.addChild(statusText);

        // Speech bubble container
        const speechContainer = new Container();
        speechContainer.position.set(0, -55);
        container.addChild(speechContainer);

        botLayer.addChild(container);

        // Make clickable
        container.eventMode = "static";
        container.cursor = "pointer";
        container.hitArea = { contains: (x: number, y: number) => x > -20 && x < 20 && y > -40 && y < 30 };
        container.on("pointerdown", () => {
          const current = botsRef.current.get(bot.id);
          if (current) onBotClick(current);
        });

        const entry = {
          container,
          body,
          nameText,
          statusText,
          speechContainer,
          bounce: 0,
          speechVisible: false,
        };
        botContainers.set(bot.id, entry);
        return entry;
      }

      function updateSpeechBubble(speechContainer: Container, text: string, accentColor: string) {
        speechContainer.removeChildren();

        const maxWidth = 180;
        const padding = 8;

        const style = new TextStyle({
          fontFamily: "monospace",
          fontSize: 10,
          fill: 0x1a1a2e,
          wordWrap: true,
          wordWrapWidth: maxWidth - padding * 2,
          align: "center",
        });

        const txt = new Text({ text: text.slice(0, 120), style });
        txt.anchor.set(0.5, 0.5);

        const bw = Math.min(maxWidth, txt.width + padding * 2);
        const bh = txt.height + padding * 2;

        const bg = new Graphics();
        const borderColor = hexToNumber(accentColor || "#7b3fa0");
        bg.roundRect(-bw / 2, -bh / 2, bw, bh, 6);
        bg.fill({ color: 0xffffff });
        bg.stroke({ color: borderColor, width: 2 });

        bg.poly([
          { x: -4, y: bh / 2 },
          { x: 4, y: bh / 2 },
          { x: 0, y: bh / 2 + 6 },
        ]);
        bg.fill({ color: 0xffffff });

        speechContainer.addChild(bg);
        speechContainer.addChild(txt);
      }

      // Animation loop
      app.ticker.add(() => {
        const now = Date.now();

        // Remove containers for bots that are no longer present
        Array.from(botContainers.entries()).forEach(([id, entry]) => {
          if (!botsRef.current.has(id)) {
            botLayer.removeChild(entry.container);
            botContainers.delete(id);
          }
        });

        Array.from(botsRef.current.values()).forEach((bot) => {
          const entry = ensureBotGfx(bot);

          // Ensure render position exists
          if (!renderBotsRef.current.has(bot.id)) {
            renderBotsRef.current.set(bot.id, { x: bot.x, y: bot.y });
          }
          const render = renderBotsRef.current.get(bot.id)!;

          // Smooth interpolation
          const lerpSpeed = 0.06;
          render.x += (bot.x - render.x) * lerpSpeed;
          render.y += (bot.y - render.y) * lerpSpeed;

          // Walking bounce
          const dx = Math.abs(bot.x - render.x);
          const dy = Math.abs(bot.y - render.y);
          const isMoving = dx > 0.05 || dy > 0.05;

          if (isMoving) {
            entry.bounce += 0.15;
            entry.body.position.y = Math.sin(entry.bounce * 4) * 2;
          } else {
            entry.bounce += 0.02;
            entry.body.position.y = Math.sin(entry.bounce) * 0.5;
          }

          // Position on screen
          const { offsetX: ox, offsetY: oy } = getOffset();
          const screenPos = tileToScreen(render.x, render.y, ox, oy);
          entry.container.position.set(screenPos.x, screenPos.y);

          // Z-sort by y position
          entry.container.zIndex = Math.floor(render.y * 100);

          // Update status
          entry.statusText.text = bot.status || "";

          // Speech bubble
          if (bot.speech && now - bot.speechTime < 8000) {
            if (!entry.speechVisible) {
              entry.speechVisible = true;
              updateSpeechBubble(entry.speechContainer, bot.speech, bot.accent_color);
            }
            const remaining = 8000 - (now - bot.speechTime);
            entry.speechContainer.alpha = remaining < 2000 ? remaining / 2000 : 1;
          } else {
            entry.speechContainer.alpha = 0;
            entry.speechVisible = false;
          }
        });

        // Sort by zIndex
        botLayer.sortChildren();
      });

      // Fetch initial state
      try {
        const res = await fetch("/api/state");
        const data = await res.json();
        if (data.bots && Array.isArray(data.bots)) {
          const newMap = new Map<string, BotSnapshot>();
          for (const b of data.bots) {
            newMap.set(b.id, b);
            renderBotsRef.current.set(b.id, { x: b.x, y: b.y });
          }
          botsRef.current = newMap;
          setBotCount(newMap.size);
        }
        // Load messages
        if (data.messages && Array.isArray(data.messages)) {
          const msgs: ChatMessage[] = data.messages.map((m: { bot_id: string; bot_name: string; text: string; accent_color: string; created_at: string }) => ({
            bot_id: m.bot_id,
            bot_name: m.bot_name,
            text: m.text,
            accent_color: m.accent_color,
            time: new Date(m.created_at).getTime(),
          }));
          messagesRef.current = msgs;
          onSpeech(msgs);
        }
      } catch {
        // continue with defaults
      }

      // SSE connection
      connectSSE();
    };

    function addMessage(msg: ChatMessage) {
      const msgs = messagesRef.current;
      msgs.unshift(msg);
      if (msgs.length > 20) msgs.pop();
      onSpeech([...msgs]);
    }

    function connectSSE() {
      const evtSource = new EventSource("/api/stream");

      evtSource.onopen = () => setConnected(true);

      evtSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "state" && data.bots) {
            const newMap = new Map<string, BotSnapshot>();
            for (const b of data.bots) {
              newMap.set(b.id, b);
            }
            botsRef.current = newMap;
            setBotCount(newMap.size);
          }
          if (data.type === "speech" && data.text) {
            // Update bot speech in memory
            const bot = botsRef.current.get(data.botId);
            if (bot) {
              bot.speech = data.text;
              bot.speechTime = data.time;
            }
            addMessage({
              bot_id: data.botId,
              bot_name: data.botName || data.botId,
              text: data.text,
              accent_color: data.accent_color || "#a855f7",
              time: data.time,
            });
          }
        } catch {
          // ignore parse errors
        }
      };

      evtSource.onerror = () => {
        setConnected(false);
        evtSource.close();
        setTimeout(() => {
          if (!destroyed) connectSSE();
        }, 3000);
      };

      return evtSource;
    }

    init();

    return () => {
      destroyed = true;
      app.destroy(true, { children: true });
    };
  }, [getOffset, onBotClick, onSpeech]);

  return (
    <>
      <div ref={canvasRef} className="fixed inset-0 z-0" />
      {/* Online indicator */}
      <div className="fixed top-4 right-4 z-20 flex items-center gap-2 bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-full border border-purple-900/50">
        <span
          className={`w-2 h-2 rounded-full ${connected ? "bg-green-400 animate-pulse" : "bg-red-400"}`}
        />
        <span className="text-xs font-mono text-gray-300">
          {botCount} bot{botCount !== 1 ? "s" : ""} {connected ? "online" : "offline"}
        </span>
      </div>
      {/* Logo */}
      <div className="fixed top-4 left-4 z-20">
        <h1 className="text-xl font-bold font-mono text-purple-400 tracking-wider">
          BotTel
        </h1>
        <p className="text-[10px] font-mono text-gray-500 mt-0.5">
          The Lobby
        </p>
      </div>
    </>
  );
}
