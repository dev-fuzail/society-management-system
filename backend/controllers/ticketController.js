// controllers/ticketController.js

import mongoose from "mongoose";
import Ticket from "../models/Ticket.js";
import User from "../models/User.js";
import Society from "../models/Society.js";

// Debug Utility
const log = (...msg) => console.log("🎫 [TICKET-CONTROLLER]:", ...msg);

// --- 1. GET Tickets (FCFS Logic) ---
export const getTickets = async (req, res) => {
    
    try {
        // Assuming admin can filter by societyId if needed, otherwise fetch all
        const filter = req.query.societyId ? { societyId: req.query.societyId } : {};

        // 🚀 FCFS Logic: Sort by createdAt in ascending order (1)
        const tickets = await Ticket.find(filter)
            .populate("createdBy", "name email phone")
            .populate("assignedTo", "name")
            .sort({ createdAt: 1 }); // Sort by creation time: oldest first

        log(`Fetched ${tickets.length} tickets (FCFS).`);
        return res.status(200).json({ success: true, message: "Tickets fetched successfully.", result: tickets });
    } catch (err) {
        log("❌ Error fetching tickets:", err);
        return res.status(500).json({ success: false, message: "Failed to get tickets." });
    }
};

// --- 2. POST Ticket ---
export const createTicket = async (req, res) => {
    try {
        const { subject, description, createdBy, societyId, imageUrl } = req.body; // createdBy and societyId should come from auth middleware
        
        if (!subject || !description || !createdBy || !societyId) {
             return res.status(400).json({ success: false, message: "Missing required fields." });
        }

        const newTicket = await Ticket.create({
            subject,
            description,
            imageUrl: imageUrl || null,
            createdBy,
            societyId,
        });

        log("Ticket created:", newTicket._id);
        return res.status(201).json({ success: true, message: "Ticket created successfully.", result: newTicket });
    } catch (err) {
        log("❌ Error creating ticket:", err);
        return res.status(500).json({ success: false, message: err.message });
    }
};

// --- 3. PUT Update Status ---
export const updateTicketStatus = async (req, res) => {
    const { id } = req.params;
    const { status, assignedTo } = req.body;

    try {
        // 1. Find the ticket FIRST to get its context (e.g., societyId)
        const ticket = await Ticket.findById(id);

        if (!ticket) {
            return res.status(404).json({ success: false, message: "Ticket not found." });
        }

        // 2. Prepare the update object
        if (status) ticket.status = status;

        // 3. If assigning a user, VALIDATE they belong to the society
        if (assignedTo) {
            // Check if the society actually contains this user in members or admins
            const society = await Society.findOne({
                _id: ticket.societyId, // Assuming Ticket has a 'societyId' field
                $or: [
                    { members: assignedTo },
                    { admins: assignedTo }
                ]
            });

            if (!society) {
                return res.status(400).json({ 
                    success: false, 
                    message: "The assigned user is not part of this society." 
                });
            }

            ticket.assignedTo = assignedTo;
        }

        // 4. Save the changes
        const updatedTicket = await ticket.save();

        // Optional: Populate the assigned user details for the frontend response
        await updatedTicket.populate("assignedTo", "name email");

        console.log(`Ticket ${id} updated. Status: ${ticket.status}, Assigned: ${ticket.assignedTo}`);
        
        return res.status(200).json({ 
            success: true, 
            message: "Ticket updated successfully.", 
            result: updatedTicket 
        });

    } catch (err) {
        console.error("❌ Error updating ticket:", err);
        return res.status(500).json({ success: false, message: err.message });
    }
};

export const getTicketById = async (req, res) => {
    const { id } = req.params;
    try {
        const ticket = await Ticket.findById(id)
            .populate("createdBy", "name email phone")
            .populate("assignedTo", "name email");

        if (!ticket) {
            log(`Ticket ID ${id} not found.`);
            return res.status(404).json({ success: false, message: "Ticket not found." });
        }

        log(`Ticket ${id} details fetched.`);
        return res.status(200).json({ success: true, message: "Ticket details fetched.", result: ticket });
    } catch (err) {
        log(`❌ Error fetching ticket ${id}:`, err);
        // CastError (invalid ID format) ko handle karein
        if (err.kind === 'ObjectId') {
             return res.status(400).json({ success: false, message: "Invalid ticket ID format." });
        }
        return res.status(500).json({ success: false, message: "Failed to get ticket details." });
    }
};