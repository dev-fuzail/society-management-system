import express from 'express';
import apartmentRoutes from './apartmentRoutes.js';
import authRoutes from './authRoutes.js';
import societyRoutes from './societyRoutes.js';
import chatRoutes from './chatRoutes.js';
import ticketRoutes from './ticketRoutes.js';
import announcementRoutes from './announcementRoutes.js';
import electionRoutes from './electionRoutes.js';
import serviceRoutes from './serviceRoutes.js';
import amenityRoutes from './amenityRoutes.js';


const router = express.Router();

router.use('/auth', authRoutes);
router.use('/societies', societyRoutes);
router.use('/apartments', apartmentRoutes);
router.use("/chat", chatRoutes);
router.use('/tickets', ticketRoutes);
router.use('/announcements', announcementRoutes);
router.use('/elections', electionRoutes);
router.use('/services', serviceRoutes);
router.use('/amenities', amenityRoutes);
export default router;
