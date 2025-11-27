import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema({
  invoice_id: { type: mongoose.Schema.Types.ObjectId, ref: "Invoice", required: true },
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  amount: { type: Number, required: true },
  method: { type: String, enum: ["PayFast", "Cash", "Bank"], required: true },
  status: { type: String, enum: ["pending", "completed", "failed"], default: "pending" },
  transaction_ref: { type: String },
}, { timestamps: { createdAt: "created_at" } });

export default mongoose.model("Payment", paymentSchema);
