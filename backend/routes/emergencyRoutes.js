import express from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import {
  getEmergencyContacts,
  createEmergencyContact,
  updateEmergencyContact,
  deleteEmergencyContact,
} from '../controllers/emergencyController.js';

const router = express.Router();

router.get('/:societyId', authMiddleware, getEmergencyContacts);
router.post('/:societyId', authMiddleware, createEmergencyContact);
router.patch('/:id', authMiddleware, updateEmergencyContact);
router.delete('/:id', authMiddleware, deleteEmergencyContact);

export default router;
