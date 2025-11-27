import mongoose from "mongoose";

const societyInviteSchema = new mongoose.Schema({
  society_id: { type: mongoose.Schema.Types.ObjectId, ref: "Society", required: true },
  role: { type: String, default: 'member' },
  token: { type: String, required: true },
  status: { type: String, default: 'pending' },
}, { timestamps: { createdAt: "created_at" } });

export default mongoose.model("societyInvite", societyInviteSchema);
