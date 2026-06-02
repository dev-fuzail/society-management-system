import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone: { type: String },
  role: { 
    type: String, 
    enum: ["resident", "admin", "service_provider", "committee_member"], 
    required: true 
  },
  society_id: { type: mongoose.Schema.Types.ObjectId, ref: "Society" },
  apartment_id: { type: mongoose.Schema.Types.ObjectId, ref: "Apartment" },

  // 🔑 Forget password fields
  resetPasswordToken: { type: String },
  resetPasswordExpires: { type: Date },

  // 🛡️ 2FA Fields
  isTwoFactorEnabled: { type: Boolean, default: false },
  twoFactorCode: { type: String },
  twoFactorCodeExpires: { type: Date },

  fcm_tokens: {
    type: [
      {
        token: { type: String, required: true },
        platform: { type: String },
        created_at: { type: Date, default: Date.now },
      },
    ],
    default: [],
  },

  avatar: { type: String },
}, { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } });

export default mongoose.model("User", userSchema);
