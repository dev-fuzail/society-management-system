import mongoose from "mongoose";

const electionSchema = new mongoose.Schema({
  society_id: { type: mongoose.Schema.Types.ObjectId, ref: "Society", required: true },
  title: { type: String, required: true },
  start_date: { type: Date, required: true },
  end_date: { type: Date, required: true },
  status: { type: String, enum: ["ongoing", "completed"], default: "ongoing" },
  result_published: { type: Boolean, default: false },
  result_published_at: { type: Date },
  results: {
    type: [
      {
        candidate_id: { type: mongoose.Schema.Types.ObjectId, ref: "Candidate", required: true },
        user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        candidate_name: { type: String, required: true },
        votes: { type: Number, default: 0 },
      },
    ],
    default: [],
  },
  winners: {
    type: [
      {
        candidate_id: { type: mongoose.Schema.Types.ObjectId, ref: "Candidate", required: true },
        user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        candidate_name: { type: String, required: true },
        votes: { type: Number, default: 0 },
      },
    ],
    default: [],
  },
  is_tie: { type: Boolean, default: false },
}, { timestamps: { createdAt: "created_at" } });

electionSchema.index({ status: 1, end_date: 1, result_published: 1 });

export default mongoose.model("Election", electionSchema);
