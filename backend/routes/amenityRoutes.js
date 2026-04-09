import express from "express";
import {
  createAmenity,
  getAmenities,
  bookAmenity,
  getBookings,
  updateBookingStatus
} from "../controllers/amenityController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

// Amenities
router.post("/", authMiddleware, createAmenity);
router.get("/", authMiddleware, getAmenities);

// Bookings
router.post("/bookings", authMiddleware, bookAmenity);
router.get("/bookings", authMiddleware, getBookings);
router.patch("/bookings/:id/status", authMiddleware, updateBookingStatus);

export default router;
