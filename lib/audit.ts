import { getDb } from "./mongodb";
import { uid } from "./uid";
import type { AuditEntry, AuditAction, SessionUser } from "./types";

export interface LogAuditInput {
  actor: SessionUser;
  action: AuditAction;
  schoolId?: string;
  schoolName?: string;
  targetType: string;
  targetId?: string;
  targetLabel?: string;
  details?: AuditEntry["details"];
}

/**
 * Records one audit entry. Deliberately never throws — a logging failure
 * must never block or roll back the actual operation it's describing. Worst
 * case, one entry is missing from the trail; that's far better than a
 * legitimate payment removal failing because the audit write hiccuped.
 */
export async function logAudit(input: LogAuditInput): Promise<void> {
  try {
    const db = await getDb();
    const entry: AuditEntry = {
      id: uid("audit"),
      timestamp: Date.now(),
      actorId: input.actor.id,
      actorName: input.actor.name || input.actor.email || "—",
      actorRole: input.actor.role,
      action: input.action,
      schoolId: input.schoolId,
      schoolName: input.schoolName,
      targetType: input.targetType,
      targetId: input.targetId,
      targetLabel: input.targetLabel,
      details: input.details,
    };
    await db.collection<AuditEntry>("audit_logs").insertOne(entry);
  } catch {
    // Swallow — see the note above.
  }
}

export interface ListAuditLogsOptions {
  schoolId?: string;
  limit?: number;
}

export async function listAuditLogs({ schoolId, limit = 200 }: ListAuditLogsOptions = {}): Promise<AuditEntry[]> {
  const db = await getDb();
  const filter: Record<string, unknown> = {};
  if (schoolId) filter.schoolId = schoolId;
  const docs = await db
    .collection<AuditEntry & { _id?: unknown }>("audit_logs")
    .find(filter)
    .sort({ timestamp: -1 })
    .limit(limit)
    .toArray();
  return docs.map(({ _id, ...rest }) => rest);
}
