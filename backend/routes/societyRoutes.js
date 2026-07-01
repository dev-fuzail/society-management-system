import express from 'express';
import {
  updateSociety,
  getSocietyMembers,
  getUserSocieties,
  getMaintenanceSettings,
  updateMaintenanceSettings,
  getMaintenanceAuditHistory,
} from '../controllers/societyController.js';

const router = express.Router();

router.put('/update', updateSociety);
router.get("/:societyId/maintenance-settings", getMaintenanceSettings);
router.put("/:societyId/maintenance-settings", updateMaintenanceSettings);
router.get("/:societyId/maintenance-settings/history", getMaintenanceAuditHistory);
router.get("/:societyId/members", getSocietyMembers);
router.get("/user-society/:user_id/", getUserSocieties)

export default router;
