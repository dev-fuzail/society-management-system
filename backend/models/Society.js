import mongoose from "mongoose";

const societySchema = new mongoose.Schema({
  name: { type: String, required: true },
  address: { type: String, required: true },
  city: { type: String, required: true },
  contact_email: { type: String },
  total_apartments: { type: Number, default: 0 },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], // all members
  admins: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],  // admins
  status: { type: String, enum: ['active', 'disabled'], default: 'active' },
  maintenance_config: {
    amount: { type: Number, default: 0 },
    currency: { type: String, default: "PKR" },
    due_day: { type: Number, min: 1, max: 31, default: 1 },
    grace_period_days: { type: Number, min: 0, default: 0 },
    late_payment_charge: { type: Number, min: 0, default: 0 },
    effective_date: { type: Date },
  },
  bank_account: {
    bank_name: { type: String },
    account_title: { type: String },
    account_number: { type: String },
    iban: { type: String },
  },
  pricing_modules: {
    maintenance: {
      enabled: { type: Boolean, default: true },
      amount: { type: Number, default: 0 },
      currency: { type: String, default: "PKR" },
      due_day: { type: Number, min: 1, max: 31, default: 1 },
      grace_period_days: { type: Number, min: 0, default: 0 },
      late_payment_charge: { type: Number, min: 0, default: 0 },
      effective_date: { type: Date },
    },
    custom: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
}, { timestamps: true });

export default mongoose.model("Society", societySchema);
