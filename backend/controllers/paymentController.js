import Invoice from "../models/Invoice.js";
import Payment from "../models/Payment.js";
import Society from "../models/Society.js";
import { createSocietyPaymentIntent } from "../services/stripeService.js";

export const createStripePaymentIntent = async (req, res) => {
  try {
    const { invoiceId } = req.body;

    if (!invoiceId) {
      return res.status(400).json({ success: false, message: "Invoice ID is required." });
    }

    const invoice = await Invoice.findById(invoiceId);

    if (!invoice) {
      return res.status(404).json({ success: false, message: "Invoice not found." });
    }

    const society = await Society.findById(invoice.society_id);

    if (!society) {
      return res.status(404).json({ success: false, message: "Society not found." });
    }

    const paymentIntent = await createSocietyPaymentIntent({ society, invoice });

    const payment = await Payment.findOneAndUpdate(
      { invoice_id: invoice._id },
      {
        invoice_id: invoice._id,
        user_id: invoice.user_id,
        society_id: society._id,
        amount: invoice.amount,
        currency: invoice.currency,
        method: "Stripe",
        provider: "Stripe",
        status: "pending",
        transaction_ref: paymentIntent.id,
        stripe_payment_intent_id: paymentIntent.id,
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    return res.status(200).json({
      success: true,
      message: "Stripe payment intent created successfully.",
      result: {
        payment,
        payment_intent_id: paymentIntent.id,
        client_secret: paymentIntent.client_secret,
        publishable_key: normalizeStripeConfig(society.stripe_config || {}).publishable_key,
        amount: invoice.amount,
        currency: invoice.currency,
      },
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};