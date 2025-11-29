// models/Ticket.js

import mongoose from "mongoose";

const ticketSchema = new mongoose.Schema({
    // Ticket identification and content
    subject: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    
    // Status (used for FCFS queue management)
    status: {
        type: String,
        enum: ['Pending', 'In Progress', 'Resolved', 'Closed'],
        default: 'Pending',
    },
    
    // References to other collections
    createdBy: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "User", 
        required: true 
    },
    societyId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "Society", 
        required: true 
    },
    
    // Admin/Staff who picked up the ticket (optional)
    assignedTo: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "User", 
        default: null 
    },
    
    // Critical for FCFS sorting: MongoDB automatically adds these.
}, { timestamps: true });

export default mongoose.model("Ticket", ticketSchema);