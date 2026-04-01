import type { DbType } from '../db/index.ts';
import { audit_log } from '../db/schema.ts';

export async function logAudit(
  db: DbType,
  action: string,
  userId: number | null,
  entityType?: string,
  entityId?: number,
  details?: Record<string, unknown>
) {
  await db.insert(audit_log).values({
    action,
    user_id: userId,
    entity_type: entityType ?? null,
    entity_id: entityId ?? null,
    details: details ?? null,
  });
}
