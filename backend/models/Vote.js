import mongoose from "mongoose";

const voteSchema = new mongoose.Schema({
  election_id: { type: mongoose.Schema.Types.ObjectId, ref: "Election", required: true },
  voter_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  candidate_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
}, { timestamps: { createdAt: "created_at" } });

export default mongoose.model("Vote", voteSchema);
