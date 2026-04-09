import mongoose from "mongoose";

const amenitySchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, enum: ['PER_USER', 'FLAT_EVENT'], required: true },
  base_price: { type: Number, required: true },
  max_capacity: { type: Number, required: true },
  society_id: { type: mongoose.Schema.Types.ObjectId, ref: "Society", required: true },
}, { timestamps: { createdAt: "created_at" } });

export default mongoose.model("Amenity", amenitySchema);
