import mongoose from "mongoose";

const candidateSchema = new mongoose.Schema({
  election_id: { type: mongoose.Schema.Types.ObjectId, ref: "Election", required: true },
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  manifesto: { type: String, required: true },
}, { timestamps: { createdAt: "created_at" } });

// Ensure a user can only be a candidate once per election
candidateSchema.index({ election_id: 1, user_id: 1 }, { unique: true });

export default mongoose.model("Candidate", candidateSchema);
