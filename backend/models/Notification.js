import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  society_id: { type: mongoose.Schema.Types.ObjectId, ref: "Society" },
  type: { type: String, required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  data: { type: mongoose.Schema.Types.Mixed },
  is_read: { type: Boolean, default: false },
  read_at: { type: Date },
}, { timestamps: { createdAt: "created_at" } });

export default mongoose.model("Notification", notificationSchema);
