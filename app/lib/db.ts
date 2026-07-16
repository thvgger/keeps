import { Pool } from "@neondatabase/serverless";

const globalForDb = globalThis as unknown as {
  pool: Pool | undefined;
};

export const pool = globalForDb.pool ?? new Pool({ connectionString: process.env.DATABASE_URL });

if (process.env.NODE_ENV !== "production") {
  globalForDb.pool = pool;
}

export async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE,
      email TEXT UNIQUE,
      password_hash TEXT,
      google_id TEXT UNIQUE,
      avatar_url TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      color TEXT NOT NULL,
      font TEXT DEFAULT 'Inter',
      paragraphs TEXT[],
      list_items JSONB,
      ordered_list_items TEXT[],
      interactive_prompt TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await pool.query(`
    ALTER TABLE notes ADD COLUMN IF NOT EXISTS user_id TEXT REFERENCES users(id) ON DELETE CASCADE;
  `);

  await pool.query(`
    ALTER TABLE notes ADD COLUMN IF NOT EXISTS public_link_id TEXT UNIQUE;
  `);

  await pool.query(`
    ALTER TABLE notes ADD COLUMN IF NOT EXISTS public_role TEXT;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS note_collaborators (
      note_id TEXT REFERENCES notes(id) ON DELETE CASCADE,
      user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
      role TEXT NOT NULL DEFAULT 'viewer',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (note_id, user_id)
    );
  `);
}
