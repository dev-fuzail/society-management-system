import Amenity from "../models/Amenity.js";
import AmenityBooking from "../models/AmenityBooking.js";
import Wallet from "../models/Wallet.js";
import Transaction from "../models/Transaction.js";
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

    // 2. Conflict Validation — PER_USER amenities (e.g. Gym) allow concurrent bookings up to capacity.
    //    FLAT_EVENT amenities (e.g. Event Hall) are exclusive — one booking per time slot.
    if (amenity.type === "FLAT_EVENT") {
      const conflict = await AmenityBooking.findOne({
        amenity_id,
        status: { $in: ["PENDING", "APPROVED"] },
        start_time: { $lt: new Date(end_time) },
        end_time: { $gt: new Date(start_time) },
      });
      if (conflict) {
        return res.status(400).json({ success: false, message: "This venue is already booked or pending for the selected time slot." });
      }
    }

    if (amenity.type === "PER_USER" && amenity.max_capacity) {
      const concurrent = await AmenityBooking.countDocuments({
        amenity_id,
        status: { $in: ["PENDING", "APPROVED"] },
        start_time: { $lt: new Date(end_time) },
        end_time: { $gt: new Date(start_time) },
      });
      if (concurrent >= amenity.max_capacity) {
        return res.status(400).json({ success: false, message: `This amenity is at full capacity (${amenity.max_capacity}) for the selected time slot.` });
      }
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

// Update booking status (Admin only) — credits wallet on APPROVED
export const updateBookingStatus = async (req, res) => {
  try {
    if (!requireRole(req, res, ["admin"])) return;
    const { id } = req.params;
    const { status } = req.body; // APPROVED, REJECTED, CANCELLED

    const booking = await AmenityBooking.findById(id);
    if (!booking) return res.status(404).json({ success: false, message: "Booking not found" });

    const wasApproved = booking.status !== "APPROVED" && status === "APPROVED";
    booking.status = status;
    await booking.save();

    if (wasApproved && booking.calculated_price > 0) {
      const wallet = await Wallet.findOneAndUpdate(
        { society_id: booking.society_id },
        { $setOnInsert: { balance: 0, currency: "PKR" } },
        { upsert: true, new: true }
      );
      await Wallet.updateOne({ _id: wallet._id }, { $inc: { balance: booking.calculated_price } });
      await Transaction.create({
        wallet_id: wallet._id,
        type: "credit",
        amount: booking.calculated_price,
        title: "Amenity booking payment",
        reference_type: "manual",
        status: "completed",
        created_by: req.user._id,
      });
    }

    res.status(200).json({ success: true, message: `Booking ${status.toLowerCase()} successfully`, result: booking });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
