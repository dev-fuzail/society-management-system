import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema({
  invoice_id: { type: mongoose.Schema.Types.ObjectId, ref: "Invoice", required: true },
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  society_id: { type: mongoose.Schema.Types.ObjectId, ref: "Society" },
  amount: { type: Number, required: true },
  currency: { type: String, default: "PKR" },
  method: { type: String, enum: ["PayFast", "Cash", "Bank", "System"], default: "System" },
  provider: { type: String, enum: ["PayFast", "Cash", "Bank", "System"], default: "System" },
  status: { type: String, enum: ["pending", "completed", "failed"], default: "pending" },
  transaction_ref: { type: String },
  payfast_payment_id: { type: String },
  payment_date: { type: Date },
}, { timestamps: { createdAt: "created_at" } });

paymentSchema.index({ invoice_id: 1 }, { unique: true });

export default mongoose.model("Payment", paymentSchema);
