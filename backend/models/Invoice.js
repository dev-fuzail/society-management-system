import mongoose from "mongoose";

const invoiceSchema = new mongoose.Schema({
  apartment_id: { type: mongoose.Schema.Types.ObjectId, ref: "Apartment", required: true },
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  amount: { type: Number, required: true },
  month: { type: String },
  due_date: { type: Date },
  status: { type: String, enum: ["paid", "unpaid"], default: "unpaid" },
  generated_at: { type: Date, default: Date.now },
}, { timestamps: { createdAt: "created_at" } });

export default mongoose.model("Invoice", invoiceSchema);
