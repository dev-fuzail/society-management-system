import Amenity from "../models/Amenity.js";
import AmenityBooking from "../models/AmenityBooking.js";
import Apartment from "../models/Apartment.js";
import Invoice from "../models/Invoice.js";
import Payment from "../models/Payment.js";
import mongoose from "mongoose";
import { createAndSendNotification } from "../services/notificationService.js";

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

    // 1. Fetch Amenity Details
    const amenity = await Amenity.findById(amenity_id);
    if (!amenity) return res.status(404).json({ success: false, message: "Amenity not found" });

    // 2. Conflict validation. FLAT_EVENT amenities (e.g. Event Hall) are scheduled,
    //    exclusive bookings and require a time slot. PER_USER amenities (e.g. Gym)
    //    are anytime-accessible — no slot to book, capacity just caps active members.
    if (amenity.type === "FLAT_EVENT") {
      if (!start_time || !end_time || new Date(end_time) <= new Date(start_time)) {
        return res.status(400).json({ success: false, message: "End time must be after start time." });
      }

      const conflict = await AmenityBooking.findOne({
        amenity_id,
        status: { $in: ["PENDING", "APPROVED"] },
        start_time: { $lt: new Date(end_time) },
        end_time: { $gt: new Date(start_time) },
      });
      if (conflict) {
        return res.status(400).json({ success: false, message: "This venue is already booked or pending for the selected time slot." });
      }
    } else if (amenity.type === "PER_USER") {
      const activeCount = await AmenityBooking.countDocuments({
        amenity_id,
        status: { $in: ["PENDING", "APPROVED"] },
      });
      if (activeCount >= amenity.max_capacity) {
        return res.status(400).json({ success: false, message: `This amenity is at full capacity (${amenity.max_capacity}).` });
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
      ...(amenity.type === "FLAT_EVENT" ? { start_time, end_time } : {}),
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

// Update booking status (Admin only). Approval generates an invoice for the
// booking fee — payable online/offline through the same pipeline maintenance
// invoices use — instead of crediting the wallet directly, so wallet crediting
// happens exactly once, at actual payment time.
export const updateBookingStatus = async (req, res) => {
  try {
    if (!requireRole(req, res, ["admin"])) return;
    const { id } = req.params;
    const { status } = req.body; // APPROVED, REJECTED, CANCELLED

    if (!["APPROVED", "REJECTED", "CANCELLED"].includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status." });
    }

    const booking = await AmenityBooking.findById(id).populate("amenity_id", "name");
    if (!booking) return res.status(404).json({ success: false, message: "Booking not found" });

    const previousStatus = booking.status;
    booking.status = status;

    if (status === "APPROVED" && booking.calculated_price > 0) {
      if (booking.invoice_id) {
        // Already invoiced (e.g. re-approved after a rejection) — reactivate
        // instead of creating a duplicate invoice.
        await Invoice.updateOne(
          { _id: booking.invoice_id, status: "cancelled" },
          { status: "pending" }
        );
      } else {
        // Apartment ownership is tracked on the Apartment side (owned_by), not
        // reliably on User.apartment_id — same lookup maintenanceBillingService uses.
        const apartment = await Apartment.findOne({ owned_by: booking.user_id }).select("_id");
        if (apartment) {
          const invoice = await Invoice.create({
            society_id: booking.society_id,
            apartment_id: apartment._id,
            user_id: booking.user_id,
            amount: booking.calculated_price,
            currency: "PKR",
            type: "amenity",
            month: booking.amenity_id?.name || "Amenity booking",
            due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            status: "pending",
          });
          invoice.payment_link = `maintenance-payment?invoiceId=${invoice._id.toString()}`;
          await invoice.save();

          await Payment.create({
            invoice_id: invoice._id,
            user_id: booking.user_id,
            society_id: booking.society_id,
            amount: invoice.amount,
            currency: "PKR",
            method: "System",
            provider: "System",
            status: "pending",
          });

          booking.invoice_id = invoice._id;
        }
      }
    } else if ((status === "REJECTED" || status === "CANCELLED") && booking.invoice_id) {
      // Pull back an unpaid invoice if approval is being reversed. Leave a
      // paid invoice alone — that needs a refund flow, not a silent cancel.
      await Invoice.updateOne(
        { _id: booking.invoice_id, status: "pending" },
        { status: "cancelled" }
      );
    }

    await booking.save();

    if (previousStatus !== status && (status === "APPROVED" || status === "REJECTED")) {
      const amenityName = booking.amenity_id?.name || "an amenity";
      await createAndSendNotification({
        io: req.io,
        userIds: [booking.user_id],
        societyId: booking.society_id,
        type: "amenity_booking",
        title: status === "APPROVED" ? "Amenity booking approved" : "Amenity booking declined",
        message: status === "APPROVED"
          ? `Your booking for ${amenityName} was approved.${booking.invoice_id ? " An invoice is now available for payment." : ""}`
          : `Your booking for ${amenityName} was declined.`,
        data: {
          category: "amenity",
          bookingId: booking._id.toString(),
          amenityName,
          status,
          ...(booking.invoice_id ? {
            invoiceId: booking.invoice_id.toString(),
            deepLink: `maintenance-payment?invoiceId=${booking.invoice_id.toString()}`,
          } : {}),
        },
      });
    }

    res.status(200).json({ success: true, message: `Booking ${status.toLowerCase()} successfully`, result: booking });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
