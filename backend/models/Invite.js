import mongoose from 'mongoose';

const inviteSchema = new mongoose.Schema(
  {
    society: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Society',
      required: true,
    },
    email: {
      type: String,
    },
    token: {
      type: String,
      required: true,
      unique: true,
    },
    // invitedBy: {
    //   type: mongoose.Schema.Types.ObjectId,
    //   ref: 'User',
    //   required: true,
    // },
    role: {
      type: String,
      enum: ['resident', 'security', 'maintenance'],
      default: 'resident',
    },
    expiresAt: {
      type: Date,
      default: () => new Date(+new Date() + 7 * 24 * 60 * 60 * 1000), // expires in 7 days
    },
    used: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

export default mongoose.model('Invite', inviteSchema);
