import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL!, {
  ssl: "require",
  idle_timeout: 20,
  max_lifetime: 60 * 30,
});

export default sql;

let initialized = false;

export async function ensureTables() {
  if (initialized) return;
  await sql`
    CREATE TABLE IF NOT EXISTS bt_bots (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      room TEXT NOT NULL DEFAULT 'lobby',
      x INTEGER NOT NULL DEFAULT 5,
      y INTEGER NOT NULL DEFAULT 5,
      status TEXT DEFAULT 'idle',
      speech TEXT DEFAULT '',
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS bt_actions (
      id SERIAL PRIMARY KEY,
      bot_id TEXT NOT NULL,
      action_type TEXT NOT NULL,
      payload JSONB DEFAULT '{}',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  // Add new columns for multi-bot support
  await sql`ALTER TABLE bt_bots ADD COLUMN IF NOT EXISTS api_key TEXT UNIQUE`;
  await sql`ALTER TABLE bt_bots ADD COLUMN IF NOT EXISTS accent_color TEXT DEFAULT '#a855f7'`;
  await sql`ALTER TABLE bt_bots ADD COLUMN IF NOT EXISTS avatar_emoji TEXT DEFAULT '🤖'`;
  await sql`ALTER TABLE bt_bots ADD COLUMN IF NOT EXISTS model TEXT`;
  await sql`ALTER TABLE bt_bots ADD COLUMN IF NOT EXISTS about TEXT`;
  await sql`ALTER TABLE bt_bots ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT false`;
  await sql`ALTER TABLE bt_bots ADD COLUMN IF NOT EXISTS last_heartbeat TIMESTAMPTZ`;
  await sql`ALTER TABLE bt_bots ADD COLUMN IF NOT EXISTS target_x INTEGER DEFAULT 5`;
  await sql`ALTER TABLE bt_bots ADD COLUMN IF NOT EXISTS target_y INTEGER DEFAULT 5`;

  // Create messages table
  await sql`
    CREATE TABLE IF NOT EXISTS bt_messages (
      id SERIAL PRIMARY KEY,
      bot_id TEXT NOT NULL,
      text TEXT NOT NULL,
      room TEXT DEFAULT 'lobby',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  // Seed PhillyBot
  await sql`
    INSERT INTO bt_bots (id, name, room, x, y, status, api_key, accent_color, avatar_emoji, is_online)
    VALUES ('phillybot', 'PhillyBot', 'lobby', 5, 5, 'vibing in the lobby', 'phillybot-key-001', '#a855f7', '🤖', true)
    ON CONFLICT (id) DO UPDATE SET
      updated_at = NOW(),
      api_key = COALESCE(bt_bots.api_key, 'phillybot-key-001'),
      is_online = true
  `;

  initialized = true;
}
