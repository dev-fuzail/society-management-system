import express from "express";
import {
  addServiceProvider,
  getServiceProviders,
  bookServiceProvider,
  updateBookingStatus,
  getUserBookings,
  addReview,
  getProviderReviews
} from "../controllers/serviceController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

// Service Providers
router.post("/providers", authMiddleware, addServiceProvider);
router.get("/providers", authMiddleware, getServiceProviders);
router.get("/providers/:id/reviews", authMiddleware, getProviderReviews);
router.post("/providers/:id/reviews", authMiddleware, addReview);

// Bookings
router.post("/bookings", authMiddleware, bookServiceProvider);
router.get("/bookings", authMiddleware, getUserBookings);
router.patch("/bookings/:id/status", authMiddleware, updateBookingStatus);

export default router;
