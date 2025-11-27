import mongoose from "mongoose";

const serviceRequestSchema = new mongoose.Schema({
  type: { type: String, required: true }, // e.g. plumber, electrician
  requested_by: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  assigned_to: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  status: { type: String, enum: ["pending", "in_progress", "completed"], default: "pending" },
}, { timestamps: { createdAt: "created_at" } });

export default mongoose.model("ServiceRequest", serviceRequestSchema);
