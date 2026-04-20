import Amenity from "../models/Amenity.js";
import AmenityBooking from "../models/AmenityBooking.js";
import mongoose from "mongoose";

const requireRole = (req, res, roles) => {
  if (!req.user || !roles.includes(req.user.role)) {
    res.status(403).json({ success: false, message: "Access denied" });
    return false;
  }
  return true;
};

// Define amenities (Admin only)
export const createAmenity = async (req, res) => {
  try {
    if (!requireRole(req, res, ["admin"])) return;
    const { name, type, base_price, max_capacity, society_id } = req.body;
    const amenity = new Amenity({ name, type, base_price, max_capacity, society_id });
    await amenity.save();
    res.status(201).json({ success: true, message: "Amenity defined successfully", result: amenity });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get all amenities for a society
export const getAmenities = async (req, res) => {
  try {
    const { society_id } = req.query;
    const amenities = await Amenity.find({ society_id });
    res.status(200).json({ success: true, result: amenities });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Book an amenity (Resident)
export const bookAmenity = async (req, res) => {
  try {
    if (!requireRole(req, res, ["resident", "admin"])) return;
    const { amenity_id, society_id, start_time, end_time, guest_count } = req.body;
    const user_id = req.user.id;

    if (!start_time || !end_time || new Date(end_time) <= new Date(start_time)) {
      return res.status(400).json({ success: false, message: "End time must be after start time." });
    }

    // 1. Fetch Amenity Details
    const amenity = await Amenity.findById(amenity_id);
    if (!amenity) return res.status(404).json({ success: false, message: "Amenity not found" });

    // 2. Conflict Validation (Overlap Check)
    const overlappingBooking = await AmenityBooking.findOne({
      amenity_id,
      status: { $in: ["PENDING", "APPROVED"] },
      $or: [
        { start_time: { $lt: new Date(end_time) }, end_time: { $gt: new Date(start_time) } }
      ]
    });

    if (overlappingBooking) {
      return res.status(400).json({ success: false, message: "This time slot is already booked or pending approval." });
    }

    // 3. Pricing Logic
    let calculated_price = 0;
    if (amenity.type === 'PER_USER') {
      calculated_price = amenity.base_price * (guest_count || 1);
    } else if (amenity.type === 'FLAT_EVENT') {
      // Event halls are treated as one-time bookings (non-recurring flat fee).
      calculated_price = amenity.base_price;
    }

    const booking = new AmenityBooking({
      amenity_id,
      user_id,
      society_id,
      start_time,
      end_time,
      calculated_price,
      guest_count
    });

    await booking.save();
    res.status(201).json({ success: true, message: "Booking request submitted", result: booking });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get all bookings (Admin can filter by society, Resident gets their own)
export const getBookings = async (req, res) => {
  try {
    const { society_id } = req.query;
    let query = {};
    
    if (req.user.role === 'admin') {
      query = { society_id };
    } else {
      query = { user_id: req.user.id };
    }

    const bookings = await AmenityBooking.find(query)
      .populate("amenity_id")
      .populate("user_id", "name email phone")
      .sort({ start_time: 1 });

    res.status(200).json({ success: true, result: bookings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update booking status (Admin only)
export const updateBookingStatus = async (req, res) => {
  try {
    if (!requireRole(req, res, ["admin"])) return;
    const { id } = req.params;
    const { status } = req.body; // APPROVED, REJECTED, CANCELLED

    const booking = await AmenityBooking.findByIdAndUpdate(id, { status }, { new: true });
    if (!booking) return res.status(404).json({ success: false, message: "Booking not found" });

    res.status(200).json({ success: true, message: `Booking ${status.toLowerCase()} successfully`, result: booking });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
