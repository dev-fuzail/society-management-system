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
import notificationRoutes from './notificationRoutes.js';
import authMiddleware from '../middleware/authMiddleware.js';
import { updateUserRole } from '../controllers/electionController.js';
import {
	addServiceProvider,
	updateServiceProvider,
	getServiceProviders,
	bookServiceProvider,
	updateBookingStatus,
	getUserBookings,
	addReview,
	getProviderReviews,
} from '../controllers/serviceController.js';


const router = express.Router();

router.use('/auth', authRoutes);
router.use('/societies', societyRoutes);
router.use('/apartments', apartmentRoutes);
router.use("/chat", chatRoutes);
router.use('/tickets', ticketRoutes);
router.use('/announcements', announcementRoutes);
router.use('/elections', electionRoutes);
router.use('/notifications', notificationRoutes);
router.patch('/users/roles', authMiddleware, updateUserRole);

// Contract aliases from tasks.md
router.post('/providers', authMiddleware, addServiceProvider);
router.get('/providers', authMiddleware, getServiceProviders);
router.patch('/providers/:id', authMiddleware, updateServiceProvider);
router.get('/providers/:id/reviews', authMiddleware, getProviderReviews);
router.post('/providers/:id/reviews', authMiddleware, addReview);
router.post('/bookings', authMiddleware, bookServiceProvider);
router.get('/bookings', authMiddleware, getUserBookings);
router.patch('/bookings/:id/status', authMiddleware, updateBookingStatus);

router.use('/services', serviceRoutes);
router.use('/amenities', amenityRoutes);
export default router;
