import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  type: { type: String, required: true },
  message: { type: String, required: true },
  is_read: { type: Boolean, default: false },
}, { timestamps: { createdAt: "created_at" } });

export default mongoose.model("Notification", notificationSchema);
