import mongoose from "mongoose";

const societySchema = new mongoose.Schema({
  name: { type: String, required: true },
  address: { type: String, required: true },
  city: { type: String, required: true },
  contact_email: { type: String },
  total_apartments: { type: Number, default: 0 },
}, { timestamps: { createdAt: "created_at" } });

export default mongoose.model("Society", societySchema);
