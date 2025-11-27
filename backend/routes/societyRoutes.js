import express from 'express';
import { createSociety, getSocieties, updateSociety, getSocietyMembers, getUserSocieties } from '../controllers/societyController.js';

const router = express.Router();

router.post('/', createSociety);
router.get('/', getSocieties);
router.put('/update', updateSociety);
router.get("/:societyId/members", getSocietyMembers);
router.get("/user-society/:user_id/", getUserSocieties)

export default router;
