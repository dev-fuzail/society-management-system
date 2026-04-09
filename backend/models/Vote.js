import mongoose from "mongoose";

const voteSchema = new mongoose.Schema({
  election_id: { type: mongoose.Schema.Types.ObjectId, ref: "Election", required: true },
  voter_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  candidate_id: { type: mongoose.Schema.Types.ObjectId, ref: "Candidate", required: true },
}, { timestamps: { createdAt: "created_at" } });

// Enforce one vote per resident per election
voteSchema.index({ election_id: 1, voter_id: 1 }, { unique: true });

export default mongoose.model("Vote", voteSchema);
