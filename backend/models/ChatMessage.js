import mongoose from "mongoose";

const ChatMessageSchema = new mongoose.Schema({
  roomId: { type: mongoose.Schema.Types.ObjectId, ref: "ChatRoom", required: true },
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  text: { type: String },
  attachment: { type: String },
  createdAt: { type: Date, default: Date.now },
}, { timestamps: true });

export default mongoose.model("ChatMessage", ChatMessageSchema);
