import mongoose from "mongoose";

const amenityRequestSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  amenity: { type: String, required: true }, // e.g. gym, hall, pool
  booking_date: { type: Date, required: true },
  time_slot: { type: String },
  status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
}, { timestamps: { createdAt: "created_at" } });

export default mongoose.model("AmenityRequest", amenityRequestSchema);
