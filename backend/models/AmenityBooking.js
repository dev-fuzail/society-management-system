import mongoose from "mongoose";

const amenityBookingSchema = new mongoose.Schema({
  amenity_id: { type: mongoose.Schema.Types.ObjectId, ref: "Amenity", required: true },
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  society_id: { type: mongoose.Schema.Types.ObjectId, ref: "Society", required: true },
  // Only required for FLAT_EVENT bookings (scheduled, exclusive slots). PER_USER
  // amenities (e.g. gym) are anytime-accessible and don't carry a time slot.
  start_time: { type: Date },
  end_time: { type: Date },
  status: { type: String, enum: ["PENDING", "APPROVED", "REJECTED", "CANCELLED"], default: "PENDING" },
  calculated_price: { type: Number, required: true },
  guest_count: { type: Number, default: 0 },
  invoice_id: { type: mongoose.Schema.Types.ObjectId, ref: "Invoice" },
}, { timestamps: { createdAt: "created_at" } });

export default mongoose.model("AmenityBooking", amenityBookingSchema);
