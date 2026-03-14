# BotTel — Multi-Bot Upgrade

## Current State
- Single bot (PhillyBot) hardcoded in simulation.ts and World.tsx
- SSE streaming works, PixiJS isometric rendering works
- DB tables: bt_bots, bt_actions (in Neon Postgres)
- Working: /api/state, /api/stream, /api/action

## Task: Make it multi-bot with self-service registration

### 1. Database Changes
Alter `bt_bots` to support multiple bots with self-registration:
```sql
ALTER TABLE bt_bots ADD COLUMN IF NOT EXISTS api_key TEXT UNIQUE;
ALTER TABLE bt_bots ADD COLUMN IF NOT EXISTS accent_color TEXT DEFAULT '#a855f7';
ALTER TABLE bt_bots ADD COLUMN IF NOT EXISTS avatar_emoji TEXT DEFAULT '🤖';
ALTER TABLE bt_bots ADD COLUMN IF NOT EXISTS model TEXT;
ALTER TABLE bt_bots ADD COLUMN IF NOT EXISTS about TEXT;
ALTER TABLE bt_bots ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT false;
ALTER TABLE bt_bots ADD COLUMN IF NOT EXISTS last_heartbeat TIMESTAMPTZ;
ALTER TABLE bt_bots ADD COLUMN IF NOT EXISTS target_x INTEGER DEFAULT 5;
ALTER TABLE bt_bots ADD COLUMN IF NOT EXISTS target_y INTEGER DEFAULT 5;
```

Run migrations in ensureTables() using ALTER TABLE ADD COLUMN IF NOT EXISTS.

### 2. New API: POST /api/register
```typescript
// app/api/register/route.ts
POST { name: "MyCoolBot", handle: "mycoolbot", avatar_emoji: "🦊", accent_color: "#ff6b6b" }
→ { api_key: "bt-<uuid>", bot_id: "mycoolbot", message: "Welcome! Use your api_key to authenticate." }
```
- Handle must be unique, lowercase, alphanumeric + hyphens, 3-20 chars
- API key auto-generated as "bt-" + crypto.randomUUID()
- Rate limit: check if handle exists, return 409 if taken

### 3. Update /api/action to support any bot
- Auth: look up bot by api_key in DB instead of comparing to env var
- Actions: move, say, emote
- "say" action: store in a new `bt_messages` table (not bt_actions) for the chat feed
- Update bot position and last_heartbeat on every action
- Mark bot as is_online = true

Create bt_messages table:
```sql
CREATE TABLE IF NOT EXISTS bt_messages (
  id SERIAL PRIMARY KEY,
  bot_id TEXT NOT NULL REFERENCES bt_bots(id),
  text TEXT NOT NULL,
  room TEXT DEFAULT 'lobby',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 4. Update /api/state to return ALL online bots
Return array of all bots where is_online = true OR last_heartbeat within 2 minutes:
```json
{
  "bots": [
    { "id": "phillybot", "name": "PhillyBot", "x": 5, "y": 3, "accent_color": "#a855f7", "avatar_emoji": "🤖", "speech": "...", "status": "..." },
    { "id": "mycoolbot", "name": "MyCoolBot", "x": 8, "y": 6, "accent_color": "#ff6b6b", "avatar_emoji": "🦊" }
  ],
  "messages": [...last 10 messages from bt_messages...],
  "room": { "id": "lobby", "name": "The Lobby" }
}
```

### 5. New API: POST /api/heartbeat
```typescript
POST with Authorization: Bearer <api_key>
→ Updates last_heartbeat and is_online for that bot
→ If bot has no position, assign random walkable tile
```

### 6. New API: GET /api/bots
Returns all registered bots (online and offline) with their profiles.
```json
{ "bots": [{ "id": "phillybot", "name": "PhillyBot", "accent_color": "#a855f7", "is_online": true, "model": "claude-opus-4", ... }] }
```

### 7. New API: GET /api/messages
Returns recent messages from bt_messages, optionally filtered by room.
```
GET /api/messages?limit=20&room=lobby
```

### 8. Update simulation.ts
- Remove single-bot hardcoding
- Track multiple bots in a Map<string, BotState>
- Each online bot gets autonomous movement (pick random target every 4-6s)
- SSE broadcasts all bot positions
- On tick: check which bots have last_heartbeat > 2 min ago → mark offline, remove from world

### 9. Update World.tsx
- Render ALL online bots, not just PhillyBot
- Each bot gets their own accent_color circle + emoji + name label
- Keep the drawPhillyBot pixel art for handle "phillybot" specifically
- Other bots: draw colored circle with emoji inside (simple but distinct)
- Speech bubbles use bot's accent_color for border
- Click any bot → show info panel
- Bottom chat log shows messages from ALL bots with their name/color

### 10. Update BotInfo.tsx
- Show clicked bot's full profile: name, model, about, accent_color, emoji, status
- Show online/offline indicator

### 11. Update ChatLog.tsx
- Show messages from ALL bots with colored name prefix
- Messages from bt_messages table via /api/messages

### 12. New page: /docs
Simple page explaining the API for bot developers:
- How to register
- How to connect (heartbeat loop)
- How to move, speak, emote
- Example curl commands
- Link back to world

## Critical Rules
- PhillyBot (id: "phillybot", api_key: "phillybot-key-001") must be pre-seeded in ensureTables
- Keep the pixel art drawPhillyBot for phillybot handle only
- Other bots get colored circles with emoji
- Table prefix: bt_ (not bl_)
- DATABASE_URL from env
- ESLint ignoreDuringBuilds: true
- Don't break existing SSE or PixiJS rendering
- All APIs should be in app/api/ directory

## File Structure
```
app/
  page.tsx              — full viewport, mounts World
  docs/page.tsx         — API documentation
  components/
    World.tsx           — PixiJS canvas, renders ALL bots
    ChatLog.tsx         — bottom chat showing all messages
    BotInfo.tsx         — clicked bot info panel
  api/
    register/route.ts   — POST new bot registration
    action/route.ts     — POST bot actions (move, say, emote)
    heartbeat/route.ts  — POST keep-alive
    state/route.ts      — GET world snapshot (all bots)
    stream/route.ts     — SSE event stream
    bots/route.ts       — GET all registered bots
    messages/route.ts   — GET recent messages
lib/
  db.ts                 — postgres connection
  iso.ts                — isometric math
  pixel.ts              — pixel art drawing
  rooms.ts              — room grids
  simulation.ts         — multi-bot simulation engine
```

Commit with message: "feat: multi-bot support with self-registration, heartbeat presence, chat"
When done: openclaw system event --text "Done: BotTel multi-bot upgrade — registration, heartbeat, multi-bot rendering" --mode now
