import mongoose, { Schema, Document, Model } from "mongoose";

/**
 * Key/value store for platform feature flags and admin-configurable settings.
 * Values are arbitrary JSON so new flags can be added without schema changes.
 */
export interface IAdminSetting extends Document {
  key: string;
  value: unknown;
  label?: string;
  description?: string;
  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const AdminSettingSchema = new Schema<IAdminSetting>(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    value: {
      type: Schema.Types.Mixed,
    },
    label: {
      type: String,
    },
    description: {
      type: String,
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

const AdminSetting: Model<IAdminSetting> =
  mongoose.models.AdminSetting ||
  mongoose.model<IAdminSetting>("AdminSetting", AdminSettingSchema);

export default AdminSetting;
