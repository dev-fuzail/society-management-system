import Invoice from "../models/Invoice.js";
import Payment from "../models/Payment.js";
import Society from "../models/Society.js";
import User from "../models/User.js";
import Wallet from "../models/Wallet.js";
import Transaction from "../models/Transaction.js";
import WithdrawalRequest from "../models/WithdrawalRequest.js";
import OfflinePayment from "../models/OfflinePayment.js";
import {
  generateBasketId,
  getAccessToken,
  buildCheckoutFormHtml,
  verifyIpnHash,
  isSuccessErrorCode,
} from "../services/payfastService.js";

const APP_SCHEME = process.env.APP_SCHEME || "exp+living-sync://";

export const initiatePayfastCheckout = async (req, res) => {
  try {
    const { invoiceId } = req.params;
    const invoice = await Invoice.findById(invoiceId);

    if (!invoice) {
      return res.status(404).send("Invoice not found.");
    }

    if (invoice.status === "paid") {
      return res.status(400).send("This invoice has already been paid.");
    }

    const user = await User.findById(invoice.user_id);
    const basketId = generateBasketId(invoice._id.toString());

    await Payment.findOneAndUpdate(
      { invoice_id: invoice._id },
      {
        invoice_id: invoice._id,
        user_id: invoice.user_id,
        society_id: invoice.society_id,
        amount: invoice.amount,
        currency: invoice.currency,
        method: "PayFast",
        provider: "PayFast",
        status: "pending",
        transaction_ref: basketId,
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    const token = await getAccessToken({
      basketId,
      txnAmt: invoice.amount,
      currencyCode: invoice.currency,
    });

    const html = buildCheckoutFormHtml({
      token,
      basketId,
      txnAmt: invoice.amount,
      currencyCode: invoice.currency,
      customerMobileNo: user?.phone,
      customerEmailAddress: user?.email,
      txnDesc: `Maintenance payment - ${invoice.month || invoice.period_key || ""}`.trim(),
    });

    res.set("Content-Type", "text/html");
    return res.send(html);
  } catch (error) {
    console.error("[PAYFAST] checkout init failed:", error.message);
    return res.status(500).send(`Failed to initialize PayFast checkout: ${error.message}`);
  }
};

const creditWalletForInvoice = async (invoice) => {
  const wallet = await Wallet.findOneAndUpdate(
    { society_id: invoice.society_id },
    { $setOnInsert: { balance: 0, currency: invoice.currency } },
    { upsert: true, new: true }
  );

  await Wallet.updateOne({ _id: wallet._id }, { $inc: { balance: invoice.amount } });

  await Transaction.create({
    wallet_id: wallet._id,
    type: "credit",
    amount: invoice.amount,
    reference_type: "invoice",
    reference_id: invoice._id,
    status: "completed",
  });
};

export const handlePayfastIpn = async (req, res) => {
  try {
    const { basket_id, err_code, validation_hash } = req.query;

    if (!basket_id || !err_code) {
      return res.status(400).send("Missing required parameters.");
    }

    const hashValid = verifyIpnHash({ basketId: basket_id, errCode: err_code, validationHash: validation_hash });
    if (!hashValid) {
      console.warn("[PAYFAST] IPN hash mismatch for basket:", basket_id);
      return res.status(400).send("Invalid signature.");
    }

    const payment = await Payment.findOne({ transaction_ref: basket_id });
    if (!payment) {
      return res.status(404).send("Unknown transaction.");
    }

    if (payment.status === "completed") {
      return res.status(200).send("Already processed.");
    }

    if (!isSuccessErrorCode(err_code)) {
      payment.status = "failed";
      await payment.save();
      return res.status(200).send("Transaction marked as failed.");
    }

    const invoice = await Invoice.findById(payment.invoice_id);
    if (!invoice) {
      return res.status(404).send("Invoice not found.");
    }

    payment.status = "completed";
    payment.payment_date = new Date();
    await payment.save();

    invoice.status = "paid";
    await invoice.save();

    await creditWalletForInvoice(invoice);

    return res.status(200).send("OK");
  } catch (error) {
    console.error("[PAYFAST] IPN handling failed:", error.message);
    return res.status(500).send("Internal error processing IPN.");
  }
};

export const payfastSuccess = (req, res) => {
  const redirectUrl = `${APP_SCHEME}maintenance-payment?status=success`;
  res.send(`<html><body onload="window.location.replace('${redirectUrl}')"><h2>Payment successful</h2><p>Redirecting back to the app...</p></body></html>`);
};

export const payfastFailure = (req, res) => {
  const redirectUrl = `${APP_SCHEME}maintenance-payment?status=failure`;
  res.send(`<html><body onload="window.location.replace('${redirectUrl}')"><h2>Payment failed</h2><p>Redirecting back to the app...</p></body></html>`);
};

const getOrCreateWalletForSociety = async (societyId, currency = "PKR") => {
  return Wallet.findOneAndUpdate(
    { society_id: societyId },
    { $setOnInsert: { balance: 0, currency } },
    { upsert: true, new: true }
  );
};

export const getWalletSummary = async (req, res) => {
  try {
    const { societyId } = req.params;
    const wallet = await getOrCreateWalletForSociety(societyId);
    return res.status(200).json({ success: true, message: "Wallet fetched successfully.", result: wallet });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getWalletReport = async (req, res) => {
  try {
    const { societyId } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    const wallet = await getOrCreateWalletForSociety(societyId);

    const [transactions, totals] = await Promise.all([
      Transaction.find({ wallet_id: wallet._id })
        .sort({ created_at: -1 })
        .skip(Number(offset))
        .limit(Number(limit))
        .populate("created_by", "name"),

      Transaction.aggregate([
        { $match: { wallet_id: wallet._id, status: "completed" } },
        {
          $group: {
            _id: "$type",
            total: { $sum: "$amount" },
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    const creditEntry = totals.find((t) => t._id === "credit") || { total: 0, count: 0 };
    const debitEntry = totals.find((t) => t._id === "debit") || { total: 0, count: 0 };

    return res.status(200).json({
      success: true,
      message: "Wallet report fetched.",
      result: {
        wallet,
        transactions,
        summary: {
          total_credits: creditEntry.total,
          total_debits: debitEntry.total,
          credit_count: creditEntry.count,
          debit_count: debitEntry.count,
        },
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const addManualEntry = async (req, res) => {
  try {
    const { societyId } = req.params;
    const { type, amount, title } = req.body;

    if (!["credit", "debit"].includes(type)) {
      return res.status(400).json({ success: false, message: "type must be 'credit' or 'debit'." });
    }
    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: "A valid positive amount is required." });
    }
    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: "A title/cause is required." });
    }

    const society = await Society.findById(societyId);
    if (!society) return res.status(404).json({ success: false, message: "Society not found." });

    const isAdmin = society.admins.some((id) => id.toString() === req.user._id.toString());
    if (!isAdmin) {
      return res.status(403).json({ success: false, message: "Only society admins can add manual entries." });
    }

    const wallet = await getOrCreateWalletForSociety(societyId);

    if (type === "debit" && amount > wallet.balance) {
      return res.status(400).json({ success: false, message: "Debit amount exceeds current wallet balance." });
    }

    const delta = type === "credit" ? amount : -amount;
    await Wallet.updateOne({ _id: wallet._id }, { $inc: { balance: delta } });

    const transaction = await Transaction.create({
      wallet_id: wallet._id,
      type,
      amount,
      title: title.trim(),
      reference_type: "manual",
      status: "completed",
      created_by: req.user._id,
    });

    const updatedWallet = await Wallet.findById(wallet._id);

    return res.status(201).json({
      success: true,
      message: `Manual ${type} of PKR ${amount} recorded.`,
      result: { transaction, wallet: updatedWallet },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const createWithdrawalRequest = async (req, res) => {
  try {
    const { societyId, amount, bank_details } = req.body;
    const userId = req.user._id;

    if (!societyId || !amount || amount <= 0) {
      return res.status(400).json({ success: false, message: "Society ID and a valid amount are required." });
    }

    const society = await Society.findById(societyId);
    if (!society) {
      return res.status(404).json({ success: false, message: "Society not found." });
    }

    const isSocietyAdmin = society.admins.some((adminId) => adminId.toString() === userId.toString());
    if (!isSocietyAdmin) {
      return res.status(403).json({ success: false, message: "Only society administrators can request withdrawals." });
    }

    const wallet = await getOrCreateWalletForSociety(societyId);

    if (amount > wallet.balance) {
      return res.status(400).json({ success: false, message: "Requested amount exceeds available wallet balance." });
    }

    const withdrawal = await WithdrawalRequest.create({
      wallet_id: wallet._id,
      society_admin_id: userId,
      amount,
      bank_details,
      status: "pending",
    });

    return res.status(201).json({ success: true, message: "Withdrawal request submitted successfully.", result: withdrawal });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

export const getSocietyWithdrawalRequests = async (req, res) => {
  try {
    const { societyId } = req.params;
    const wallet = await Wallet.findOne({ society_id: societyId });

    if (!wallet) {
      return res.status(200).json({ success: true, message: "No wallet yet for this society.", result: [] });
    }

    const requests = await WithdrawalRequest.find({ wallet_id: wallet._id }).sort({ requested_at: -1 });
    return res.status(200).json({ success: true, message: "Withdrawal requests fetched successfully.", result: requests });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ── Offline / Manual Bank Payment ─────────────────────────────────────────────

export const getSocietyBankAccount = async (req, res) => {
  try {
    const { societyId } = req.params;
    const society = await Society.findById(societyId).select("bank_account name");
    if (!society) return res.status(404).json({ success: false, message: "Society not found." });
    return res.status(200).json({ success: true, result: { bank_account: society.bank_account, society_name: society.name } });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const updateSocietyBankAccount = async (req, res) => {
  try {
    const { societyId } = req.params;
    const { bank_name, account_title, account_number, iban } = req.body;

    const society = await Society.findById(societyId);
    if (!society) return res.status(404).json({ success: false, message: "Society not found." });

    const isAdmin = society.admins.some((id) => id.toString() === req.user._id.toString());
    if (!isAdmin) return res.status(403).json({ success: false, message: "Only admins can update bank account details." });

    society.bank_account = { bank_name, account_title, account_number, iban };
    await society.save();
    return res.status(200).json({ success: true, message: "Bank account updated.", result: society.bank_account });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const submitOfflinePayment = async (req, res) => {
  try {
    const { invoice_id, society_id, screenshot_url, notes } = req.body;
    const user_id = req.user._id;

    const invoice = await Invoice.findById(invoice_id);
    if (!invoice) return res.status(404).json({ success: false, message: "Invoice not found." });
    if (invoice.status === "paid") return res.status(400).json({ success: false, message: "Invoice is already paid." });

    const existing = await OfflinePayment.findOne({ invoice_id, status: "pending" });
    if (existing) return res.status(400).json({ success: false, message: "A pending offline payment for this invoice already exists." });

    const offline = await OfflinePayment.create({ invoice_id, user_id, society_id, screenshot_url, notes });
    return res.status(201).json({ success: true, message: "Offline payment submitted. Awaiting admin approval.", result: offline });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getOfflinePayments = async (req, res) => {
  try {
    const { societyId } = req.params;
    const { status } = req.query;
    const query = { society_id: societyId };
    if (status) query.status = status;

    const payments = await OfflinePayment.find(query)
      .populate("invoice_id", "amount currency period_key month")
      .populate("user_id", "name email")
      .sort({ created_at: -1 });

    return res.status(200).json({ success: true, result: payments });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const reviewOfflinePayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body; // "approved" | "rejected"

    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({ success: false, message: "Status must be 'approved' or 'rejected'." });
    }

    const offline = await OfflinePayment.findById(id).populate("invoice_id");
    if (!offline) return res.status(404).json({ success: false, message: "Offline payment not found." });
    if (offline.status !== "pending") return res.status(400).json({ success: false, message: "This payment has already been reviewed." });

    const society = await Society.findById(offline.society_id);
    const isAdmin = society?.admins.some((a) => a.toString() === req.user._id.toString());
    if (!isAdmin) return res.status(403).json({ success: false, message: "Only society admins can review payments." });

    offline.status = status;
    offline.reviewed_by = req.user._id;
    offline.reviewed_at = new Date();
    if (notes) offline.notes = notes;
    await offline.save();

    if (status === "approved") {
      const invoice = offline.invoice_id;
      invoice.status = "paid";
      await invoice.save();
      await creditWalletForInvoice(invoice);
    }

    return res.status(200).json({ success: true, message: `Offline payment ${status}.`, result: offline });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
