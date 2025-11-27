import mongoose from "mongoose";

const complaintSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  category: { type: String, required: true },
  description: { type: String },
  status: { type: String, enum: ["open", "in_progress", "resolved"], default: "open" },
  assigned_to: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // service provider or admin
  resolved_at: { type: Date },
}, { timestamps: { createdAt: "created_at" } });

export default mongoose.model("Complaint", complaintSchema);
