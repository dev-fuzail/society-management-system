import mongoose from "mongoose";

const offlinePaymentSchema = new mongoose.Schema({
  invoice_id: { type: mongoose.Schema.Types.ObjectId, ref: "Invoice", required: true },
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  society_id: { type: mongoose.Schema.Types.ObjectId, ref: "Society", required: true },
  screenshot_url: { type: String, required: true },
  notes: { type: String },
  status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
  reviewed_by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  reviewed_at: { type: Date },
}, { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } });

export default mongoose.model("OfflinePayment", offlinePaymentSchema);
