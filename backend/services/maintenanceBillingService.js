import Apartment from "../models/Apartment.js";
import Invoice from "../models/Invoice.js";
import Payment from "../models/Payment.js";
import Society from "../models/Society.js";
import { createAndSendNotification } from "./notificationService.js";

const ONE_HOUR_MS = 60 * 60 * 1000;

const getPeriodKey = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
};

const getMonthLabel = (date = new Date()) => {
  return date.toLocaleString("en-US", { month: "long", year: "numeric" });
};

const getLastDayOfMonth = (year, monthIndex) => {
  return new Date(year, monthIndex + 1, 0).getDate();
};

const buildDueDate = (billingDate, dueDay) => {
  const year = billingDate.getFullYear();
  const monthIndex = billingDate.getMonth();
  const safeDueDay = Math.min(dueDay, getLastDayOfMonth(year, monthIndex));
  return new Date(year, monthIndex, safeDueDay, 23, 59, 59, 999);
};

const isConfigEffective = (config, billingDate) => {
  if (!config?.effective_date) return true;

  const effectiveDate = new Date(config.effective_date);
  if (Number.isNaN(effectiveDate.getTime())) return true;

  const monthEnd = new Date(
    billingDate.getFullYear(),
    billingDate.getMonth() + 1,
    0,
    23,
    59,
    59,
    999
  );

  return effectiveDate <= monthEnd;
};

const isDuplicateKeyError = (error) => error?.code === 11000;

const createPaymentRecord = async ({ invoice, societyId, currency }) => {
  try {
    return await Payment.create({
      invoice_id: invoice._id,
      user_id: invoice.user_id,
      society_id: societyId,
      amount: invoice.amount,
      currency,
      method: "System",
      status: "pending",
    });
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      return Payment.findOne({ invoice_id: invoice._id });
    }

    throw error;
  }
};

const createMaintenanceInvoice = async ({
  society,
  apartment,
  periodKey,
  monthLabel,
  dueDate,
  billingDate,
}) => {
  const config = society.maintenance_config || {};
  const currency = config.currency || "PKR";
  const paymentLink = `maintenance-payment?invoiceId=`;

  try {
    const invoice = await Invoice.create({
      society_id: society._id,
      apartment_id: apartment._id,
      user_id: apartment.owned_by,
      amount: config.amount,
      currency,
      type: "maintenance",
      period_key: periodKey,
      month: monthLabel,
      due_date: dueDate,
      generated_at: billingDate,
      status: "pending",
    });

    invoice.payment_link = `${paymentLink}${invoice._id.toString()}`;
    await invoice.save();

    const payment = await createPaymentRecord({ invoice, societyId: society._id, currency });
    return { invoice, payment, created: true };
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      const invoice = await Invoice.findOne({
        society_id: society._id,
        apartment_id: apartment._id,
        period_key: periodKey,
        type: "maintenance",
      });
      return { invoice, payment: null, created: false };
    }

    throw error;
  }
};

const sendMaintenanceReminder = async ({ io, society, invoice, dueDate }) => {
  if (!invoice || invoice.reminder_sent_at) {
    return null;
  }

  const dueDateLabel = dueDate.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const result = await createAndSendNotification({
    io,
    userIds: [invoice.user_id],
    societyId: society._id,
    type: "maintenance_reminder",
    title: `${society.name} maintenance invoice`,
    message: `${invoice.currency} ${invoice.amount} is due by ${dueDateLabel}.`,
    data: {
      category: "maintenance",
      societyId: society._id.toString(),
      societyName: society.name,
      invoiceId: invoice._id.toString(),
      amount: String(invoice.amount),
      currency: invoice.currency,
      dueDate: dueDate.toISOString(),
      paymentLink: invoice.payment_link || `maintenance-payment?invoiceId=${invoice._id.toString()}`,
      deepLink: invoice.payment_link || `maintenance-payment?invoiceId=${invoice._id.toString()}`,
    },
  });

  await Invoice.updateOne(
    { _id: invoice._id, reminder_sent_at: { $exists: false } },
    { reminder_sent_at: new Date() }
  );

  return result;
};

export const generateMonthlyMaintenanceBilling = async ({
  io,
  billingDate = new Date(),
  force = false,
} = {}) => {
  if (!force && billingDate.getDate() !== 1) {
    return {
      skipped: true,
      reason: "Monthly maintenance billing runs on the 1st day of each month.",
      invoicesCreated: 0,
      remindersSent: 0,
    };
  }

  const societies = await Society.find({ status: "active" });
  const periodKey = getPeriodKey(billingDate);
  const monthLabel = getMonthLabel(billingDate);
  const summary = {
    skipped: false,
    periodKey,
    societiesProcessed: 0,
    invoicesCreated: 0,
    invoicesExisting: 0,
    paymentsCreated: 0,
    remindersSent: 0,
  };

  for (const society of societies) {
    const config = society.maintenance_config || {};
    const amount = Number(config.amount || 0);

    if (!amount || amount <= 0 || !isConfigEffective(config, billingDate)) {
      continue;
    }

    const dueDay = Number(config.due_day || 1);
    const dueDate = buildDueDate(billingDate, dueDay);
    const apartments = await Apartment.find({
      society_id: society._id,
      owned_by: { $exists: true, $ne: null },
      status: { $ne: "rejected" },
    }).select("_id owned_by");

    if (!apartments.length) {
      continue;
    }

    summary.societiesProcessed += 1;

    for (const apartment of apartments) {
      const { invoice, payment, created } = await createMaintenanceInvoice({
        society,
        apartment,
        periodKey,
        monthLabel,
        dueDate,
        billingDate,
      });

      if (created) {
        summary.invoicesCreated += 1;
        if (payment) summary.paymentsCreated += 1;
      } else {
        summary.invoicesExisting += 1;
      }

      const reminder = await sendMaintenanceReminder({ io, society, invoice, dueDate });
      if (reminder) {
        summary.remindersSent += 1;
      }
    }
  }

  return summary;
};

export const startMaintenanceBillingScheduler = (io) => {
  let isRunning = false;

  const run = async () => {
    if (isRunning) return;
    isRunning = true;

    try {
      const result = await generateMonthlyMaintenanceBilling({ io });
      if (!result.skipped) {
        console.log("[MAINTENANCE BILLING]", result);
      }
    } catch (error) {
      console.error("[MAINTENANCE BILLING] Failed:", error.message);
    } finally {
      isRunning = false;
    }
  };

  run();
  return setInterval(run, ONE_HOUR_MS);
};
