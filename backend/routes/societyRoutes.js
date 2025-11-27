import express from 'express';
import { createSociety, getSocieties } from '../controllers/societyController.js';

const router = express.Router();

router.post('/', createSociety);
router.get('/', getSocieties);

export default router;
