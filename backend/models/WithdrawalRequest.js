import mongoose from "mongoose";

const withdrawalRequestSchema = new mongoose.Schema({
  wallet_id: { type: mongoose.Schema.Types.ObjectId, ref: "Wallet", required: true },
  society_admin_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  amount: { type: Number, required: true },
  bank_details: {
    bank_name: { type: String },
    account_title: { type: String },
    account_number: { type: String },
  },
  status: { type: String, enum: ["pending", "approved", "rejected", "paid"], default: "pending" },
  processed_at: { type: Date },
}, { timestamps: { createdAt: "requested_at", updatedAt: false } });

export default mongoose.model("WithdrawalRequest", withdrawalRequestSchema);
