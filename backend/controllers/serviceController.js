import ServiceProvider from "../models/ServiceProvider.js";
import ServiceBooking from "../models/ServiceBooking.js";
import Review from "../models/Review.js";
import mongoose from "mongoose";

// Add new service provider (Admin only)
export const addServiceProvider = async (req, res) => {
  try {
    const { name, category, contact, society_id } = req.body;
    const provider = new ServiceProvider({ name, category, contact, society_id });
    await provider.save();
    res.status(201).json({ success: true, message: "Service provider added successfully", result: provider });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get all service providers for a society
export const getServiceProviders = async (req, res) => {
  try {
    const { society_id } = req.query;
    const providers = await ServiceProvider.find({ society_id });
    res.status(200).json({ success: true, result: providers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Book a service provider (Resident)
export const bookServiceProvider = async (req, res) => {
  try {
    const { provider_id, date, society_id } = req.body;
    const user_id = req.user.id;

    const booking = new ServiceBooking({ provider_id, user_id, society_id, date });
    await booking.save();

    res.status(201).json({ success: true, message: "Service booked successfully", result: booking });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update booking status (Admin/Provider)
export const updateBookingStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // PENDING, COMPLETED, CANCELLED

    const booking = await ServiceBooking.findByIdAndUpdate(id, { status }, { new: true });
    if (!booking) return res.status(404).json({ success: false, message: "Booking not found" });

    res.status(200).json({ success: true, message: `Booking marked as ${status}`, result: booking });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get user's bookings
export const getUserBookings = async (req, res) => {
  try {
    const user_id = req.user.id;
    const bookings = await ServiceBooking.find({ user_id })
      .populate("provider_id")
      .sort({ created_at: -1 });
    res.status(200).json({ success: true, result: bookings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Add review (Resident)
export const addReview = async (req, res) => {
  try {
    const { id: provider_id } = req.params;
    const { rating, comment } = req.body;
    const user_id = req.user.id;

    // Check if COMPLETED booking exists for this user and provider
    const completedBooking = await ServiceBooking.findOne({
      provider_id,
      user_id,
      status: "COMPLETED"
    });

    if (!completedBooking) {
      return res.status(403).json({ 
        success: false, 
        message: "You can only review a service after it has been completed." 
      });
    }

    // Check if already reviewed
    const existingReview = await Review.findOne({ provider_id, user_id });
    if (existingReview) {
      return res.status(400).json({ success: false, message: "You have already reviewed this provider." });
    }

    const review = new Review({ provider_id, user_id, rating, comment });
    await review.save();

    // Update average rating for provider
    const reviews = await Review.find({ provider_id });
    const avgRating = reviews.reduce((acc, curr) => acc + curr.rating, 0) / reviews.length;
    
    await ServiceProvider.findByIdAndUpdate(provider_id, {
      average_rating: avgRating,
      total_reviews: reviews.length
    });

    res.status(201).json({ success: true, message: "Review added successfully", result: review });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get reviews for a provider
export const getProviderReviews = async (req, res) => {
  try {
    const { id: provider_id } = req.params;
    const reviews = await Review.find({ provider_id }).populate("user_id", "name avatar");
    res.status(200).json({ success: true, result: reviews });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
