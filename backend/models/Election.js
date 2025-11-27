import mongoose from "mongoose";

const electionSchema = new mongoose.Schema({
  society_id: { type: mongoose.Schema.Types.ObjectId, ref: "Society", required: true },
  title: { type: String, required: true },
  start_date: { type: Date, required: true },
  end_date: { type: Date, required: true },
  status: { type: String, enum: ["ongoing", "completed"], default: "ongoing" },
}, { timestamps: { createdAt: "created_at" } });

export default mongoose.model("Election", electionSchema);
