import mongoose, { Schema, Document, Model } from "mongoose";

export type AnnouncementAudience = "all" | "admins" | "active";
export type AnnouncementStatus = "draft" | "sent";

export interface IAnnouncement extends Document {
  title: string;
  body: string;
  audience: AnnouncementAudience;
  status: AnnouncementStatus;
  createdBy: mongoose.Types.ObjectId;
  createdByUsername: string;
  sentAt?: Date;
  deliveredCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const AnnouncementSchema = new Schema<IAnnouncement>(
  {
    title: {
      type: String,
      required: true,
      maxlength: 140,
      trim: true,
    },
    body: {
      type: String,
      required: true,
      maxlength: 4000,
    },
    audience: {
      type: String,
      enum: ["all", "admins", "active"],
      default: "all",
    },
    status: {
      type: String,
      enum: ["draft", "sent"],
      default: "draft",
      index: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    createdByUsername: {
      type: String,
      default: "",
    },
    sentAt: {
      type: Date,
    },
    deliveredCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

AnnouncementSchema.index({ createdAt: -1 });

const Announcement: Model<IAnnouncement> =
  mongoose.models.Announcement ||
  mongoose.model<IAnnouncement>("Announcement", AnnouncementSchema);

export default Announcement;
