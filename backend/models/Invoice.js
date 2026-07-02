import mongoose from "mongoose";

const invoiceSchema = new mongoose.Schema({
  society_id: { type: mongoose.Schema.Types.ObjectId, ref: "Society" },
  apartment_id: { type: mongoose.Schema.Types.ObjectId, ref: "Apartment", required: true },
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  amount: { type: Number, required: true },
  currency: { type: String, default: "PKR" },
  type: { type: String, enum: ["maintenance", "general", "amenity"], default: "general" },
  period_key: { type: String },
  month: { type: String },
  due_date: { type: Date },
  payment_link: { type: String },
  reminder_sent_at: { type: Date },
  due_soon_reminder_sent_at: { type: Date },
  status: {
    type: String,
    enum: ["pending", "paid", "partially_paid", "overdue", "cancelled", "unpaid"],
    default: "pending",
  },
  generated_at: { type: Date, default: Date.now },
}, { timestamps: { createdAt: "created_at" } });

invoiceSchema.index(
  { society_id: 1, apartment_id: 1, period_key: 1, type: 1 },
  { unique: true, partialFilterExpression: { type: "maintenance" } }
);

export default mongoose.model("Invoice", invoiceSchema);
