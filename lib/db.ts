import mongoose from "mongoose";
import "@/models/User";
import "@/models/Chat";
import "@/models/Message";
import "@/models/Story";
import "@/models/Report";

const MONGODB_URI = process.env.MONGODB_URI as string;
const DB_NAME = process.env.DB_NAME || "chat-app"; 

if (!MONGODB_URI) {
  throw new Error("Please define the MONGODB_URI in .env.local");
}

let cached = (global as any).mongoose || { conn: null, promise: null };

export async function connectDB() {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = mongoose
      .connect(MONGODB_URI, {
        bufferCommands: false,
        dbName: DB_NAME, 
      })
      .then((mongoose) => mongoose);
    (global as any).mongoose = cached;
  }
  cached.conn = await cached.promise;
  return cached.conn;
}