import { getDb } from "./database.js";

export interface Application {
  id: number;
  category: string;
  company: string;
  role: string;
  source: string;
  url: string;
  urlHash: string;
  status: string;
  language: string;
  appliedAt: string;
  notes: string | null;
  isPriority: number;
  badge: string | null;
}

function mapRow(row: Record<string, unknown>): Application {
  return {
    id: row.id as number,
    category: row.category as string,
    company: row.company as string,
    role: row.role as string,
    source: row.source as string,
    url: row.url as string,
    urlHash: row.url_hash as string,
    status: row.status as string,
    language: row.language as string,
    appliedAt: row.applied_at as string,
    notes: (row.notes as string | null) ?? null,
    isPriority: (row.is_priority as number) ?? 0,
    badge: (row.badge as string | null) ?? null,
  };
}

export function listApplications(filters: {
  category?: string;
  status?: string;
  language?: string;
  limit?: number;
  offset?: number;
}): Application[] {
  const db = getDb();
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (filters.category) { conditions.push("category = ?"); params.push(filters.category); }
  if (filters.status) { conditions.push("status = ?"); params.push(filters.status); }
  if (filters.language) { conditions.push("language = ?"); params.push(filters.language); }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const limit = filters.limit ?? 100;
  const offset = filters.offset ?? 0;

  const rows = db.prepare(`
    SELECT * FROM applications ${where} 
    ORDER BY applied_at DESC 
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset) as Record<string, unknown>[];

  return rows.map(mapRow);
}

export function getApplication(id: number): Application | null {
  const row = getDb().prepare(`SELECT * FROM applications WHERE id = ?`).get(id) as Record<string, unknown> | undefined;
  return row ? mapRow(row) : null;
}

export function createApplication(data: {
  category: string;
  company: string;
  role: string;
  source: string;
  url: string;
  urlHash: string;
  status: string;
  language: string;
  notes?: string;
  isPriority?: number;
  badge?: string;
}): Application {
  const db = getDb();
  const result = db.prepare(`
    INSERT INTO applications (category, company, role, source, url, url_hash, status, language, notes, is_priority, badge)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    data.category, data.company, data.role, data.source, data.url, data.urlHash,
    data.status, data.language, data.notes ?? null, data.isPriority ?? 0, data.badge ?? null
  );
  return getApplication(result.lastInsertRowid as number)!;
}

export function updateApplication(id: number, data: { status?: string; notes?: string }): Application | null {
  const db = getDb();
  const fields: string[] = [];
  const params: unknown[] = [];
  if (data.status !== undefined) { fields.push("status = ?"); params.push(data.status); }
  if (data.notes !== undefined) { fields.push("notes = ?"); params.push(data.notes); }
  if (!fields.length) return getApplication(id);
  params.push(id);
  db.prepare(`UPDATE applications SET ${fields.join(", ")} WHERE id = ?`).run(...params);
  return getApplication(id);
}

export function deleteApplication(id: number) {
  getDb().prepare(`DELETE FROM applications WHERE id = ?`).run(id);
}

export function getManualQueue(): Application[] {
  const rows = getDb().prepare(`
    SELECT * FROM applications WHERE status = 'manual'
    ORDER BY is_priority DESC, applied_at DESC
  `).all() as Record<string, unknown>[];
  return rows.map(mapRow);
}

export interface ApplicationStats {
  todayTotal: number;
  todayTarget: number;
  todayAutoApplied: number;
  todayManualQueue: number;
  todayFailed: number;
  allTimeTotal: number;
  allTimeAutoApplied: number;
  successRate: number;
  byCategory: {
    internships: CategoryStats;
    accommodation: CategoryStats;
    parttime: CategoryStats;
  };
}

export interface CategoryStats {
  today: number;
  target: number;
  sent: number;
  manual: number;
  failed: number;
}

export function getApplicationStats(): ApplicationStats {
  const db = getDb();

  const todayRow = db.prepare(`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as auto_applied,
      SUM(CASE WHEN status = 'manual' THEN 1 ELSE 0 END) as manual_queue,
      SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
    FROM applications
    WHERE date(applied_at) = date('now')
  `).get() as { total: number; auto_applied: number; manual_queue: number; failed: number };

  const allTimeRow = db.prepare(`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as auto_applied
    FROM applications
  `).get() as { total: number; auto_applied: number };

  const catStats = (cat: string): CategoryStats => {
    const r = db.prepare(`
      SELECT 
        COUNT(*) as today,
        SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent,
        SUM(CASE WHEN status = 'manual' THEN 1 ELSE 0 END) as manual,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
      FROM applications
      WHERE category = ? AND date(applied_at) = date('now')
    `).get(cat) as { today: number; sent: number; manual: number; failed: number };
    return { today: r.today || 0, target: 50, sent: r.sent || 0, manual: r.manual || 0, failed: r.failed || 0 };
  };

  const allTimeTotal = allTimeRow.total || 0;
  const allTimeApplied = allTimeRow.auto_applied || 0;

  return {
    todayTotal: todayRow.total || 0,
    todayTarget: 150,
    todayAutoApplied: todayRow.auto_applied || 0,
    todayManualQueue: todayRow.manual_queue || 0,
    todayFailed: todayRow.failed || 0,
    allTimeTotal,
    allTimeAutoApplied: allTimeApplied,
    successRate: allTimeTotal > 0 ? Math.round((allTimeApplied / allTimeTotal) * 100) : 0,
    byCategory: {
      internships: catStats("internships"),
      accommodation: catStats("accommodation"),
      parttime: catStats("parttime"),
    },
  };
}

export interface PriorityTarget {
  id: number;
  company: string;
  careersUrl: string;
  lastChecked: string | null;
  status: string;
  notes: string | null;
}

export function listPriorityTargets(): PriorityTarget[] {
  const rows = getDb().prepare(`SELECT * FROM priority_targets ORDER BY id`).all() as Record<string, unknown>[];
  return rows.map(r => ({
    id: r.id as number,
    company: r.company as string,
    careersUrl: r.careers_url as string,
    lastChecked: (r.last_checked as string | null) ?? null,
    status: r.status as string,
    notes: (r.notes as string | null) ?? null,
  }));
}

export function getPriorityTarget(id: number): PriorityTarget | null {
  const row = getDb().prepare(`SELECT * FROM priority_targets WHERE id = ?`).get(id) as Record<string, unknown> | undefined;
  if (!row) return null;
  return {
    id: row.id as number,
    company: row.company as string,
    careersUrl: row.careers_url as string,
    lastChecked: (row.last_checked as string | null) ?? null,
    status: row.status as string,
    notes: (row.notes as string | null) ?? null,
  };
}

export function updatePriorityTarget(id: number, data: { lastChecked?: string; status?: string; notes?: string }): PriorityTarget | null {
  const db = getDb();
  const fields: string[] = [];
  const params: unknown[] = [];
  if (data.lastChecked !== undefined) { fields.push("last_checked = ?"); params.push(data.lastChecked); }
  if (data.status !== undefined) { fields.push("status = ?"); params.push(data.status); }
  if (data.notes !== undefined) { fields.push("notes = ?"); params.push(data.notes); }
  if (!fields.length) return getPriorityTarget(id);
  params.push(id);
  db.prepare(`UPDATE priority_targets SET ${fields.join(", ")} WHERE id = ?`).run(...params);
  return getPriorityTarget(id);
}
