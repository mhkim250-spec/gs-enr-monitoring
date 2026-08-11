import { env } from "cloudflare:workers";

type CacheRow = { payload: string; updated_at: number; status: string; error: string | null };
const db = () => (env as unknown as { DB: D1Database }).DB;

export async function saveSourceData(source: string, data: Record<string, unknown>) {
  const updatedAt = Date.now();
  await db().prepare(`INSERT INTO source_cache (source, payload, updated_at, status, error)
    VALUES (?, ?, ?, 'ok', NULL)
    ON CONFLICT(source) DO UPDATE SET payload=excluded.payload, updated_at=excluded.updated_at, status='ok', error=NULL`)
    .bind(source, JSON.stringify(data), updatedAt).run();
  return { ...data, sourceStatus: { source, status: "ok", updatedAt } };
}

export async function cachedSourceData(source: string, reason: unknown) {
  const message = reason instanceof Error ? reason.message : "출처 연결에 실패했습니다.";
  const row = await db().prepare("SELECT payload, updated_at, status, error FROM source_cache WHERE source = ?")
    .bind(source).first<CacheRow>();
  if (!row) return null;
  await db().prepare("UPDATE source_cache SET status = 'stale', error = ? WHERE source = ?").bind(message, source).run();
  return { ...JSON.parse(row.payload), sourceStatus: { source, status: "stale", updatedAt: row.updated_at, error: message } };
}

export async function getSourceStatuses() {
  return db().prepare("SELECT source, updated_at, status, error FROM source_cache ORDER BY source").all();
}
