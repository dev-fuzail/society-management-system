import mongoose from "mongoose";

const serviceProviderSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: { type: String, required: true }, // e.g., Plumber, Electrician, Cleaner
  contact: { type: String, required: true },
  society_id: { type: mongoose.Schema.Types.ObjectId, ref: "Society", required: true },
  average_rating: { type: Number, default: 0 },
  total_reviews: { type: Number, default: 0 },
}, { timestamps: { createdAt: "created_at" } });

export default mongoose.model("ServiceProvider", serviceProviderSchema);
