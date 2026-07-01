import PDFDocument from "pdfkit";
import Invoice from "../models/Invoice.js";
import Society from "../models/Society.js";
import User from "../models/User.js";

const sendResponse = (res, status, message, result, success = true) => {
  return res.status(status).json({
    status: success,
    success,
    message,
    result,
  });
};

const getDocumentId = (value) => {
  if (!value) return null;
  if (typeof value === "object" && value._id) return value._id.toString();
  return value.toString();
};

const canAccessInvoice = (user, invoice) => {
  if (!user || !invoice) return false;
  const userSocietyId = getDocumentId(user.society_id);
  const invoiceSocietyId = getDocumentId(invoice.society_id);
  const invoiceUserId = getDocumentId(invoice.user_id);

  if (user.role === "admin" && userSocietyId && userSocietyId === invoiceSocietyId) {
    return true;
  }
  return invoiceUserId === getDocumentId(user._id);
};

export const getInvoices = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, type } = req.query;
    const query = {};

    if (req.user.role === "admin" && req.query.societyId) {
      query.society_id = req.query.societyId;
    } else {
      query.user_id = req.user._id;
      if (req.user.society_id) {
        query.society_id = req.user.society_id;
      }
    }

    if (status) query.status = status;
    if (type) query.type = type;

    const parsedLimit = Math.min(parseInt(limit, 10) || 20, 100);
    const parsedPage = Math.max(parseInt(page, 10) || 1, 1);
    const skip = (parsedPage - 1) * parsedLimit;

    const [items, total] = await Promise.all([
      Invoice.find(query)
        .populate("user_id", "name email phone")
        .populate("apartment_id", "apartment_name floor")
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(parsedLimit),
      Invoice.countDocuments(query),
    ]);

    return sendResponse(res, 200, "Invoices fetched successfully.", {
      items,
      page: parsedPage,
      limit: parsedLimit,
      total,
    });
  } catch (error) {
    return sendResponse(res, 500, "Failed to fetch invoices.", null, false);
  }
};

export const getSocietyPaymentSummary = async (req, res) => {
  try {
    const { societyId } = req.params;
    const { periodKey } = req.query;

    if (req.user.role !== "admin" || getDocumentId(req.user.society_id) !== societyId) {
      return sendResponse(res, 403, "Only the society's admin can view this summary.", null, false);
    }

    const query = { society_id: societyId, type: "maintenance" };
    if (periodKey) query.period_key = periodKey;

    const invoices = await Invoice.find(query)
      .populate("user_id", "name email phone")
      .populate("apartment_id", "apartment_name floor")
      .sort({ due_date: 1 });

    const summary = invoices.reduce(
      (acc, invoice) => {
        if (invoice.status === "paid") {
          acc.paidCount += 1;
          acc.totalCollected += invoice.amount;
        } else {
          acc.unpaidCount += 1;
          acc.totalDue += invoice.amount;
        }
        return acc;
      },
      { paidCount: 0, unpaidCount: 0, totalCollected: 0, totalDue: 0 }
    );

    return sendResponse(res, 200, "Society payment summary fetched successfully.", { ...summary, invoices });
  } catch (error) {
    return sendResponse(res, 500, "Failed to fetch society payment summary.", null, false);
  }
};

export const getInvoiceById = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) {
      return sendResponse(res, 404, "Invoice not found.", null, false);
    }

    if (!canAccessInvoice(req.user, invoice)) {
      return sendResponse(res, 403, "Not authorized to view this invoice.", null, false);
    }

    return sendResponse(res, 200, "Invoice fetched successfully.", invoice);
  } catch (error) {
    return sendResponse(res, 500, "Failed to fetch invoice.", null, false);
  }
};

export const downloadInvoicePdf = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate("society_id", "name address city")
      .populate("user_id", "name email phone");

    if (!invoice) {
      return sendResponse(res, 404, "Invoice not found.", null, false);
    }

    if (!canAccessInvoice(req.user, invoice)) {
      return sendResponse(res, 403, "Not authorized to download this invoice.", null, false);
    }

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=invoice-${invoice._id}.pdf`);

    const doc = new PDFDocument({ margin: 40 });
    doc.pipe(res);

    doc.fontSize(20).text("Society Invoice", { align: "center" });
    doc.moveDown();
    doc.fontSize(12).text(`Invoice ID: ${invoice._id}`);
    doc.text(`Society: ${invoice.society_id?.name || "N/A"}`);
    doc.text(`Resident: ${invoice.user_id?.name || "N/A"}`);
    doc.text(`Email: ${invoice.user_id?.email || "N/A"}`);
    doc.text(`Amount: ${invoice.currency} ${invoice.amount}`);
    doc.text(`Status: ${invoice.status}`);
    doc.text(`Period: ${invoice.period_key || "N/A"}`);
    doc.text(`Due Date: ${invoice.due_date ? new Date(invoice.due_date).toDateString() : "N/A"}`);
    doc.text(`Generated At: ${invoice.generated_at ? new Date(invoice.generated_at).toDateString() : "N/A"}`);

    doc.moveDown();
    doc.fontSize(10).text("This is a system generated invoice.");
    doc.end();
  } catch (error) {
    return sendResponse(res, 500, "Failed to generate invoice PDF.", null, false);
  }
};