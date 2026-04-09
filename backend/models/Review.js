import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema({
  provider_id: { type: mongoose.Schema.Types.ObjectId, ref: "ServiceProvider", required: true },
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String },
}, { timestamps: { createdAt: "created_at" } });

// Enforce one review per user per provider (after completed booking)
// reviewSchema.index({ provider_id: 1, user_id: 1 }, { unique: true });

export default mongoose.model("Review", reviewSchema);
