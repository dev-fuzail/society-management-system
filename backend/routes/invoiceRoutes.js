import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import { downloadInvoicePdf, getInvoiceById, getInvoices } from "../controllers/invoiceController.js";

const router = express.Router();

router.get("/", authMiddleware, getInvoices);
router.get("/:id", authMiddleware, getInvoiceById);
router.get("/:id/download", authMiddleware, downloadInvoicePdf);

export default router;