import mongoose from "mongoose";

const announcementSchema = new mongoose.Schema({
  society_id: { type: mongoose.Schema.Types.ObjectId, ref: "Society", required: true },
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  title: { type: String, required: true },
  message: { type: String, required: true },
}, { timestamps: { createdAt: "created_at" } });

export default mongoose.model("Announcement", announcementSchema);
