import "server-only";

import { query, isDbConfigured } from "@/lib/db";

let schemaInitialized = false;
let schemaInitPromise: Promise<void> | null = null;

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS site_content_records (
  id TEXT PRIMARY KEY CHECK (length(id) BETWEEN 1 AND 128),
  record JSONB NOT NULL CHECK (jsonb_typeof(record) = 'object'),
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS site_categories (
  type TEXT NOT NULL CHECK (type IN ('course', 'ai-tool', 'resource', 'opportunity', 'event')),
  name TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 80),
  PRIMARY KEY (type, name)
);

CREATE TABLE IF NOT EXISTS community_links (
  id TEXT PRIMARY KEY CHECK (length(id) BETWEEN 1 AND 80),
  platform TEXT NOT NULL CHECK (platform IN ('whatsapp', 'telegram', 'other')),
  title TEXT NOT NULL CHECK (length(title) BETWEEN 1 AND 80),
  title_en TEXT NOT NULL DEFAULT '' CHECK (length(title_en) <= 80),
  url TEXT NOT NULL CHECK (url ~ '^https?://'),
  position INTEGER NOT NULL DEFAULT 0 CHECK (position >= 0)
);

CREATE TABLE IF NOT EXISTS media_assets (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 150),
  type TEXT NOT NULL CHECK (type IN ('image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/bmp', 'image/tiff', 'image/avif')),
  size BIGINT NOT NULL CHECK (size > 0 AND size <= 8388608),
  data BYTEA NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL CHECK (length(email) BETWEEN 3 AND 254),
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  email_confirmed_at TIMESTAMPTZ,
  confirmation_token TEXT,
  preferred_locale TEXT NOT NULL DEFAULT 'ar' CHECK (preferred_locale IN ('ar', 'en')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS member_sessions (
  token TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS event_subscriptions (
  user_id UUID PRIMARY KEY REFERENCES members(id) ON DELETE CASCADE,
  events_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS event_email_dispatches (
  event_id TEXT PRIMARY KEY,
  status TEXT NOT NULL CHECK (status IN ('sending', 'sent', 'failed')),
  sent_count INTEGER NOT NULL DEFAULT 0 CHECK (sent_count >= 0),
  failed_count INTEGER NOT NULL DEFAULT 0 CHECK (failed_count >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS event_email_deliveries (
  event_id TEXT NOT NULL REFERENCES event_email_dispatches(event_id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('sending', 'sent', 'failed')),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (event_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_members_email ON members(email);
CREATE INDEX IF NOT EXISTS idx_member_sessions_expires ON member_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_event_subscriptions_enabled ON event_subscriptions(events_enabled);
CREATE INDEX IF NOT EXISTS idx_event_email_deliveries_status ON event_email_deliveries(status);
`;

export async function ensureSchema(): Promise<void> {
  if (schemaInitialized || !isDbConfigured()) return;

  if (schemaInitPromise) {
    return schemaInitPromise;
  }

  schemaInitPromise = (async () => {
    try {
      await query(SCHEMA_SQL);
      schemaInitialized = true;
    } catch (error) {
      console.error("Failed to initialize PostgreSQL schema:", error);
      throw error;
    } finally {
      schemaInitPromise = null;
    }
  })();

  return schemaInitPromise;
}
