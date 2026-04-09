import mongoose from "mongoose";

const serviceBookingSchema = new mongoose.Schema({
  provider_id: { type: mongoose.Schema.Types.ObjectId, ref: "ServiceProvider", required: true },
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  society_id: { type: mongoose.Schema.Types.ObjectId, ref: "Society", required: true },
  date: { type: Date, required: true },
  status: { type: String, enum: ["PENDING", "COMPLETED", "CANCELLED"], default: "PENDING" },
}, { timestamps: { createdAt: "created_at" } });

export default mongoose.model("ServiceBooking", serviceBookingSchema);
