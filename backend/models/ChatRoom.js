import mongoose from "mongoose";

const ChatRoomSchema = new mongoose.Schema({
  societyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Society",
    required: true,
  },
  name: { type: String, required: true },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
}, { timestamps: true });

export default mongoose.model("ChatRoom", ChatRoomSchema);
