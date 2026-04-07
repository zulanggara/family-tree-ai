import postgres from 'postgres';

function getDb() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set');
  return postgres(url, { max: 1 });
}

// ─── Types ────────────────────────────────────────────────────────────────────
export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | 'IMPORT';
export type AuditEntityType = 'member' | 'marriage' | 'admin' | 'session';

export interface AuditLog {
  id: string;
  adminUsername: string;
  adminRole: string;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string | null;
  entityName: string | null;
  details: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
}

interface AuditLogRow {
  id: string;
  admin_username: string;
  admin_role: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  entity_name: string | null;
  details: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
}

export interface LogInput {
  adminUsername: string;
  adminRole: string;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId?: string | null;
  entityName?: string | null;
  details?: Record<string, unknown> | null;
  ipAddress?: string | null;
}

export interface FetchLogsOptions {
  page?: number;
  limit?: number;
  action?: string;
  entityType?: string;
  adminUsername?: string;
}

export interface LogsResult {
  logs: AuditLog[];
  total: number;
  page: number;
  pages: number;
}

// ─── Write ────────────────────────────────────────────────────────────────────
/** Fire-and-forget safe: errors are swallowed so logging never breaks callers. */
export async function logAction(input: LogInput): Promise<void> {
  if (process.env.NEXT_PUBLIC_AUDIT_LOGS_ENABLED !== 'true') return;
  const sql = getDb();
  try {
    await sql`
      INSERT INTO audit_logs
        (admin_username, admin_role, action, entity_type,
         entity_id, entity_name, details, ip_address)
      VALUES (
        ${input.adminUsername}, ${input.adminRole},
        ${input.action}, ${input.entityType},
        ${input.entityId ?? null}, ${input.entityName ?? null},
        ${input.details ? sql.json(input.details) : null},
        ${input.ipAddress ?? null}
      )
    `;
  } catch (err) {
    console.error('[audit] Failed to log action:', err);
  } finally {
    await sql.end();
  }
}

// ─── Read ─────────────────────────────────────────────────────────────────────
export async function fetchLogs(opts: FetchLogsOptions = {}): Promise<LogsResult> {
  const sql = getDb();
  const page = Math.max(1, Math.floor(opts.page ?? 1));
  const limit = Math.min(100, Math.max(1, Math.floor(opts.limit ?? 50)));
  const offset = (page - 1) * limit;

  try {
    // Build parameterized WHERE clause
    const params: string[] = [];
    const conditions: string[] = [];

    if (opts.action) {
      params.push(opts.action);
      conditions.push(`action = $${params.length}`);
    }
    if (opts.entityType) {
      params.push(opts.entityType);
      conditions.push(`entity_type = $${params.length}`);
    }
    if (opts.adminUsername) {
      params.push(`%${opts.adminUsername}%`);
      conditions.push(`admin_username ILIKE $${params.length}`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const [countResult, rows] = await Promise.all([
      sql.unsafe<{ count: string }[]>(
        `SELECT COUNT(*)::text AS count FROM audit_logs ${where}`,
        params,
      ),
      sql.unsafe<AuditLogRow[]>(
        `SELECT id::text, admin_username, admin_role, action, entity_type,
                entity_id, entity_name, details, ip_address,
                to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS created_at
         FROM audit_logs ${where}
         ORDER BY id DESC
         LIMIT ${limit} OFFSET ${offset}`,
        params,
      ),
    ]);

    const total = parseInt(countResult[0]?.count ?? '0', 10);

    return {
      logs: rows.map(rowToLog),
      total,
      page,
      pages: Math.max(1, Math.ceil(total / limit)),
    };
  } finally {
    await sql.end();
  }
}

function rowToLog(row: AuditLogRow): AuditLog {
  return {
    id: row.id,
    adminUsername: row.admin_username,
    adminRole: row.admin_role,
    action: row.action as AuditAction,
    entityType: row.entity_type as AuditEntityType,
    entityId: row.entity_id,
    entityName: row.entity_name,
    details: row.details,
    ipAddress: row.ip_address,
    createdAt: row.created_at,
  };
}
