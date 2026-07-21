import mongoose, { Schema, Document, Model } from "mongoose";

export type AuditTargetType =
  | "user"
  | "message"
  | "story"
  | "chat"
  | "report"
  | "announcement"
  | "setting"
  | "admin"
  | "auth";

export interface IAuditLog extends Document {
  actorId: mongoose.Types.ObjectId;
  actorUsername: string;
  /** Machine-readable action key, e.g. "user.ban", "message.remove". */
  action: string;
  targetType: AuditTargetType;
  targetId?: string;
  /** Human-friendly label for the target, e.g. "@john". */
  targetLabel?: string;
  /** Arbitrary structured context (before/after values, params). */
  metadata?: Record<string, unknown>;
  reason?: string;
  ip?: string;
  createdAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    actorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    actorUsername: {
      type: String,
      default: "",
    },
    action: {
      type: String,
      required: true,
      index: true,
    },
    targetType: {
      type: String,
      enum: [
        "user",
        "message",
        "story",
        "chat",
        "report",
        "announcement",
        "setting",
        "admin",
        "auth",
      ],
      required: true,
      index: true,
    },
    targetId: {
      type: String,
    },
    targetLabel: {
      type: String,
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
    reason: {
      type: String,
      maxlength: 1000,
    },
    ip: {
      type: String,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

AuditLogSchema.index({ createdAt: -1 });

const AuditLog: Model<IAuditLog> =
  mongoose.models.AuditLog || mongoose.model<IAuditLog>("AuditLog", AuditLogSchema);

export default AuditLog;
