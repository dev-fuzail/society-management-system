// routes/ticketRoutes.js

import express from "express";
import {
    getTickets,
    createTicket,
    updateTicketStatus,
    getTicketById
} from "../controllers/ticketController.js";

const router = express.Router();

// Get all tickets (sorted FCFS)
router.get("/", getTickets);

router.post("/", createTicket);

router.get("/:id", getTicketById);

router.put("/:id/status", updateTicketStatus); // Temporary for testing



export default router;