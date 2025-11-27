import mongoose from "mongoose";

const apartmentSchema = new mongoose.Schema({
  apartment_number: { type: String, required: true },
  floor: { type: Number },
  owned_by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  society_id: { type: mongoose.Schema.Types.ObjectId, ref: "Society", required: true },
  status: { type: String, enum: ["occupied", "vacant"], default: "vacant" },
}, { timestamps: { createdAt: "created_at" } });

export default mongoose.model("Apartment", apartmentSchema);
