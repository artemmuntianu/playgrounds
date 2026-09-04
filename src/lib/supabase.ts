import fs from 'node:fs';
import path from 'node:path';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let envLoaded = false;

/**
 * Server-only helper that reads `.env.local` / `.env` from the project root into
 * `process.env`. This guarantees the node-adapter server runtime picks up the
 * credentials regardless of Vite's `import.meta.env` runtime availability.
 */
function ensureEnvLoaded(): void {
  if (envLoaded || typeof process === 'undefined' || !process.env || !process.cwd) {
    envLoaded = true;
    return;
  }
  envLoaded = true;
  for (const file of ['.env.local', '.env']) {
    try {
      const p = path.join(process.cwd(), file);
      if (!fs.existsSync(p)) continue;
      const txt = fs.readFileSync(p, 'utf-8');
      for (const line of txt.split(/\r?\n/)) {
        const m = line.trim().match(/^([A-Z0-9_]+)\s*=\s*(.*)$/);
        if (m && !process.env[m[1]]) {
          process.env[m[1]] = m[2].replace(/^["']|["']$/g, '').trim();
        }
      }
    } catch {
      // ignore
    }
  }
}

/**
 * Read a runtime env var. Prefers `process.env` (server runtime / platform env),
 * falling back to `import.meta.env` (Astro/Vite build-time .env).
 */
function readEnv(name: string): string | undefined {
  ensureEnvLoaded();
  if (typeof process !== 'undefined' && process.env && process.env[name]) {
    return process.env[name];
  }
  const meta = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env;
  return meta?.[name];
}

export function getSupabaseConfig(): { url: string; anonKey: string; serviceKey?: string } {
  const url = readEnv('SUPABASE_URL');
  // Accept both the classic ANON key and the newer publishable key (SUPABASE_KEY).
  const anonKey = readEnv('SUPABASE_ANON_KEY') ?? readEnv('SUPABASE_KEY');
  const serviceKey = readEnv('SUPABASE_SECRET_KEY');
  if (!url || !anonKey) {
    throw new Error(
      'Supabase is not configured. Set SUPABASE_URL and SUPABASE_KEY (or SUPABASE_ANON_KEY).',
    );
  }
  return { url, anonKey, serviceKey };
}

/** Server-side client (API routes / islands). Uses service role for writes (bypasses RLS). */
export function createServerClient(): SupabaseClient {
  const { url, serviceKey, anonKey } = getSupabaseConfig();
  const key = serviceKey ?? anonKey;
  return createClient(url, key, { auth: { persistSession: false } });
}

