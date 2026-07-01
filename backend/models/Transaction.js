import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema({
  wallet_id: { type: mongoose.Schema.Types.ObjectId, ref: "Wallet", required: true },
  type: { type: String, enum: ["credit", "debit", "platform_fee"], required: true },
  amount: { type: Number, required: true },
  title: { type: String }, // human-readable cause, e.g. "Water motor repair"
  reference_type: { type: String, enum: ["invoice", "withdrawal", "manual"], required: true },
  reference_id: { type: mongoose.Schema.Types.ObjectId }, // optional for manual entries
  status: { type: String, enum: ["pending", "completed"], default: "completed" },
  payfast_basket_id: { type: String },
  payfast_txn_id: { type: String },
  created_by: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // admin who added manual entry
}, { timestamps: { createdAt: "created_at", updatedAt: false } });

transactionSchema.index({ reference_type: 1, reference_id: 1 });
transactionSchema.index({ payfast_basket_id: 1 }, { unique: true, sparse: true });

export default mongoose.model("Transaction", transactionSchema);
