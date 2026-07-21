import mongoose, { Schema, Document, Model } from "mongoose";

export interface IBotMessage {
  role: string;
  text: string;
  createdAt: Date;
}

export interface IBotChat extends Document {
  userId: mongoose.Types.ObjectId;
  title: string;
  pinned: boolean;
  messages: IBotMessage[];
  createdAt: Date;
  updatedAt: Date;
}

const BotChatSchema = new Schema<IBotChat>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", index: true },
    title: { type: String, default: "" },
    pinned: { type: Boolean, default: false },
    messages: {
      type: [
        {
          role: String,
          text: String,
          createdAt: Date,
        },
      ],
      default: [],
    },
  },
  { timestamps: true, collection: "bot_chats" }
);

const BotChat: Model<IBotChat> =
  mongoose.models.BotChat || mongoose.model<IBotChat>("BotChat", BotChatSchema);

export default BotChat;
