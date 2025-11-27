import express from 'express';
import { createApartment, getApartmentsBySociety } from '../controllers/apartmentController.js';

const router = express.Router();

router.post('/', createApartment);
router.get('/', getApartmentsBySociety);

export default router;
