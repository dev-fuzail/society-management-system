import mongoose from 'mongoose';

const emergencyContactSchema = new mongoose.Schema({
  society_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Society', required: true },
  name: { type: String, required: true, trim: true },
  number: { type: String, required: true, trim: true },
  category: {
    type: String,
    enum: ['police', 'ambulance', 'fire', 'rescue', 'other'],
    default: 'other',
  },
  is_default: { type: Boolean, default: false },
}, { timestamps: true });

export default mongoose.model('EmergencyContact', emergencyContactSchema);
