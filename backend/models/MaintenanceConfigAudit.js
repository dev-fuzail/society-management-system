import mongoose from "mongoose";

const maintenanceConfigAuditSchema = new mongoose.Schema({
  society_id: { type: mongoose.Schema.Types.ObjectId, ref: "Society", required: true },
  admin_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  previous_amount: { type: Number, default: 0 },
  updated_amount: { type: Number, required: true },
  previous_config: { type: mongoose.Schema.Types.Mixed },
  updated_config: { type: mongoose.Schema.Types.Mixed, required: true },
  changed_at: { type: Date, default: Date.now },
}, { timestamps: { createdAt: "created_at" } });

maintenanceConfigAuditSchema.index({ society_id: 1, changed_at: -1 });

export default mongoose.model("MaintenanceConfigAudit", maintenanceConfigAuditSchema);
