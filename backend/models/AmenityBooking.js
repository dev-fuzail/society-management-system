import mongoose from "mongoose";

const amenityBookingSchema = new mongoose.Schema({
  amenity_id: { type: mongoose.Schema.Types.ObjectId, ref: "Amenity", required: true },
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  society_id: { type: mongoose.Schema.Types.ObjectId, ref: "Society", required: true },
  start_time: { type: Date, required: true },
  end_time: { type: Date, required: true },
  status: { type: String, enum: ["PENDING", "APPROVED", "REJECTED", "CANCELLED"], default: "PENDING" },
  calculated_price: { type: Number, required: true },
  guest_count: { type: Number, default: 0 },
}, { timestamps: { createdAt: "created_at" } });

export default mongoose.model("AmenityBooking", amenityBookingSchema);
