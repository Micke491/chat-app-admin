import AuditLog, { type AuditTargetType } from "@/models/AuditLog";
import type { AuthUser } from "./auth";

export interface AuditEntry {
  action: string;
  targetType: AuditTargetType;
  targetId?: string;
  targetLabel?: string;
  metadata?: Record<string, unknown>;
  reason?: string;
  ip?: string;
}

/**
 * Persist an audit log entry. Never throws — auditing must not break the
 * primary action, so failures are logged and swallowed.
 */
export async function writeAudit(actor: AuthUser, entry: AuditEntry): Promise<void> {
  try {
    await AuditLog.create({
      actorId: actor.id,
      actorUsername: actor.username,
      action: entry.action,
      targetType: entry.targetType,
      targetId: entry.targetId,
      targetLabel: entry.targetLabel,
      metadata: entry.metadata,
      reason: entry.reason,
      ip: entry.ip,
    });
  } catch (err) {
    console.error("[AUDIT] failed to write entry", entry.action, err);
  }
}
