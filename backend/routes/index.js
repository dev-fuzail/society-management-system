import express from 'express';
import apartmentRoutes from './apartmentRoutes.js';
import authRoutes from './authRoutes.js';
import societyRoutes from './societyRoutes.js';
import chatRoutes from './chatRoutes.js';
import ticketRoutes from './ticketRoutes.js';


const router = express.Router();

router.use('/auth', authRoutes);
router.use('/societies', societyRoutes);
router.use('/apartments', apartmentRoutes);
router.use("/chat", chatRoutes);
router.use('/tickets', ticketRoutes);
export default router;
