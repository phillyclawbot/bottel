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

interface BotState {
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
}

interface SpeechMessage {
  text: string;
  time: number;
}

interface WorldProps {
  onBotClick: (bot: BotState | null) => void;
  onSpeech: (messages: SpeechMessage[]) => void;
}

// Furniture color palette
const FURNITURE_COLORS = [0x8b5e3c, 0x6b8e23, 0xcd853f, 0x2e8b57];

export default function World({ onBotClick, onSpeech }: WorldProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const botRef = useRef<BotState>({
    id: "phillybot",
    name: "PhillyBot",
    room: "lobby",
    x: 5,
    y: 5,
    targetX: 5,
    targetY: 5,
    status: "vibing in the lobby",
    speech: "",
    speechTime: 0,
  });
  const renderBotRef = useRef<{ x: number; y: number }>({ x: 5, y: 5 });
  const speechesRef = useRef<SpeechMessage[]>([]);
  const [connected, setConnected] = useState(false);

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
      const botContainer = new Container();
      const uiContainer = new Container();

      worldContainer.addChild(floorContainer);
      worldContainer.addChild(wallContainer);
      worldContainer.addChild(furnitureContainer);
      worldContainer.addChild(botContainer);
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
            // Floor tile with subtle variation
            const g = new Graphics();
            const shade =
              (x + y) % 2 === 0 ? 0x2a2035 : 0x252030;
            drawDiamondTile(g, TILE_W, TILE_H, shade);
            g.position.set(pos.x, pos.y);
            floorContainer.addChild(g);

            // Subtle grid dots for texture
            if ((x + y) % 3 === 0) {
              const dot = new Graphics();
              dot.circle(0, 0, 1);
              dot.fill({ color: 0x3a3045, alpha: 0.5 });
              dot.position.set(pos.x + (Math.random() - 0.5) * 8, pos.y + (Math.random() - 0.5) * 4);
              floorContainer.addChild(dot);
            }
          } else if (cell === 2) {
            // Floor under wall
            const fg = new Graphics();
            drawDiamondTile(fg, TILE_W, TILE_H, 0x1a1520);
            fg.position.set(pos.x, pos.y);
            floorContainer.addChild(fg);

            // Wall block
            const g = new Graphics();
            drawWallBlock(g, TILE_W, TILE_H, 20, 0x3d2a50);
            g.position.set(pos.x, pos.y - 10);
            wallContainer.addChild(g);
          } else if (cell === 3) {
            // Floor under furniture
            const fg = new Graphics();
            drawDiamondTile(fg, TILE_W, TILE_H, 0x2a2035);
            fg.position.set(pos.x, pos.y);
            floorContainer.addChild(fg);

            // Furniture block
            const g = new Graphics();
            const colorIdx = (x * 7 + y * 3) % FURNITURE_COLORS.length;
            drawFurnitureBlock(
              g,
              TILE_W * 0.7,
              TILE_H * 0.7,
              12,
              FURNITURE_COLORS[colorIdx]
            );
            g.position.set(pos.x, pos.y - 6);
            furnitureContainer.addChild(g);
          }
        }
      }

      // Bot graphics
      const botGfx = new Container();
      const botBody = new Graphics();
      drawPhillyBot(botBody, 2);
      botGfx.addChild(botBody);

      // Name label
      const nameStyle = new TextStyle({
        fontFamily: "monospace",
        fontSize: 10,
        fill: 0xcccccc,
        align: "center",
      });
      const nameText = new Text({ text: "PhillyBot", style: nameStyle });
      nameText.anchor.set(0.5, 0);
      nameText.position.set(0, 16);
      botGfx.addChild(nameText);

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
      botGfx.addChild(statusText);

      // Speech bubble container
      const speechContainer = new Container();
      speechContainer.position.set(0, -55);
      botGfx.addChild(speechContainer);

      botContainer.addChild(botGfx);

      // Make bot clickable
      botGfx.eventMode = "static";
      botGfx.cursor = "pointer";
      // Expand hit area
      botGfx.hitArea = { contains: (x: number, y: number) => x > -20 && x < 20 && y > -40 && y < 20 };
      botGfx.on("pointerdown", () => {
        onBotClick(botRef.current);
      });

      // Animation loop
      let bounce = 0;
      let speechVisible = false;
      let speechTimer = 0;

      app.ticker.add(() => {
        const bot = botRef.current;
        const render = renderBotRef.current;

        // Smooth interpolation toward target
        const lerpSpeed = 0.06;
        render.x += (bot.x - render.x) * lerpSpeed;
        render.y += (bot.y - render.y) * lerpSpeed;

        // Walking bounce
        const dx = Math.abs(bot.x - render.x);
        const dy = Math.abs(bot.y - render.y);
        const isMoving = dx > 0.05 || dy > 0.05;

        if (isMoving) {
          bounce += 0.15;
          botBody.position.y = Math.sin(bounce * 4) * 2;
        } else {
          // Idle breathing
          bounce += 0.02;
          botBody.position.y = Math.sin(bounce) * 0.5;
        }

        // Position bot on screen
        const { offsetX: ox, offsetY: oy } = getOffset();
        const screenPos = tileToScreen(render.x, render.y, ox, oy);
        botGfx.position.set(screenPos.x, screenPos.y);

        // Update status text
        statusText.text = bot.status;

        // Speech bubble
        const now = Date.now();
        if (bot.speech && now - bot.speechTime < 8000) {
          if (!speechVisible) {
            speechVisible = true;
            speechTimer = now;
            updateSpeechBubble(speechContainer, bot.speech);
          }
          // Fade out in last 2 seconds
          const remaining = 8000 - (now - bot.speechTime);
          speechContainer.alpha = remaining < 2000 ? remaining / 2000 : 1;
        } else {
          speechContainer.alpha = 0;
          speechVisible = false;
        }
      });

      // Fetch initial state
      try {
        const res = await fetch("/api/state");
        const data = await res.json();
        if (data.bot) {
          botRef.current = data.bot;
          renderBotRef.current = { x: data.bot.x, y: data.bot.y };
          if (data.bot.speech) {
            addSpeech(data.bot.speech, data.bot.speechTime);
          }
        }
      } catch {
        // continue with defaults
      }

      // SSE connection
      connectSSE();
    };

    function updateSpeechBubble(container: Container, text: string) {
      container.removeChildren();

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
      // Bubble background
      bg.roundRect(-bw / 2, -bh / 2, bw, bh, 6);
      bg.fill({ color: 0xffffff });
      bg.stroke({ color: 0x7b3fa0, width: 2 });

      // Tail
      bg.poly([
        { x: -4, y: bh / 2 },
        { x: 4, y: bh / 2 },
        { x: 0, y: bh / 2 + 6 },
      ]);
      bg.fill({ color: 0xffffff });

      container.addChild(bg);
      container.addChild(txt);
    }

    function addSpeech(text: string, time: number) {
      const speeches = speechesRef.current;
      // Avoid duplicates
      if (speeches.length > 0 && speeches[0].text === text) return;
      speeches.unshift({ text, time });
      if (speeches.length > 5) speeches.pop();
      onSpeech([...speeches]);
    }

    function connectSSE() {
      const evtSource = new EventSource("/api/stream");

      evtSource.onopen = () => setConnected(true);

      evtSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "state" && data.bot) {
            botRef.current = data.bot;
          }
          if (data.type === "speech" && data.text) {
            botRef.current.speech = data.text;
            botRef.current.speechTime = data.time;
            addSpeech(data.text, data.time);
          }
        } catch {
          // ignore parse errors
        }
      };

      evtSource.onerror = () => {
        setConnected(false);
        evtSource.close();
        // Reconnect after 3s
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
          PhillyBot {connected ? "online" : "offline"}
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
