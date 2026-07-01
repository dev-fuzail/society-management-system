import mongoose from "mongoose";

const walletSchema = new mongoose.Schema({
  society_id: { type: mongoose.Schema.Types.ObjectId, ref: "Society", required: true, unique: true },
  balance: { type: Number, default: 0 },
  currency: { type: String, default: "PKR" },
}, { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } });

export default mongoose.model("Wallet", walletSchema);
