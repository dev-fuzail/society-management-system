import mongoose from "mongoose";

const societySchema = new mongoose.Schema({
  name: { type: String, required: true },
  address: { type: String, required: true },
  city: { type: String, required: true },
  contact_email: { type: String },
  total_apartments: { type: Number, default: 0 },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], // all members
  admins: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],  // admins
}, { timestamps: true });

export default mongoose.model("Society", societySchema);
