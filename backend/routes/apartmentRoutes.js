import express from 'express';
import { 
    createApartment, 
    getApartmentsBySociety,
    getApartmentsByUser,
    updateApartment,
    deleteApartment,
    verifyApartment,
    getSocietyApartmentsForAdmin
} from '../controllers/apartmentController.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/for-admin', authMiddleware, getSocietyApartmentsForAdmin);
router.post('/', authMiddleware, createApartment);
router.get('/my-apartments', authMiddleware, getApartmentsByUser);
router.get('/', getApartmentsBySociety);
router.put('/:id', authMiddleware, updateApartment);
router.delete('/:id', authMiddleware, deleteApartment);
router.patch('/:id/verify', authMiddleware, verifyApartment); // New route for verification

export default router;
