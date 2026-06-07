import Stripe from "stripe";

export const normalizeStripeConfig = (config = {}) => ({
  publishable_key: String(config.publishable_key || "").trim(),
  secret_key: String(config.secret_key || "").trim(),
  webhook_secret: String(config.webhook_secret || "").trim(),
  connected_account_id: String(config.connected_account_id || "").trim(),
});

export const hasStripeConfig = (config = {}) => {
  const normalized = normalizeStripeConfig(config);
  return Boolean(normalized.publishable_key && normalized.secret_key);
};

export const buildStripePaymentIntentParams = ({ society, invoice }) => {
  const amount = Math.round(Number(invoice?.amount || 0) * 100);
  const currency = String(invoice?.currency || society?.maintenance_config?.currency || "PKR").toLowerCase();

  if (!Number.isInteger(amount) || amount <= 0) {
    throw new Error("Invoice amount must be greater than zero.");
  }

  if (!/^[a-z]{3}$/.test(currency)) {
    throw new Error("Currency must be a valid 3-letter ISO code.");
  }

  return {
    amount,
    currency,
    description: `${society.name} maintenance payment`,
    metadata: {
      societyId: society._id.toString(),
      societyName: society.name,
      invoiceId: invoice._id.toString(),
      userId: invoice.user_id.toString(),
      apartmentId: invoice.apartment_id.toString(),
      invoiceType: invoice.type,
      periodKey: invoice.period_key || "",
    },
  };
};

export const createStripeClient = (stripeConfig = {}) => {
  const normalized = normalizeStripeConfig(stripeConfig);

  if (!normalized.secret_key) {
    throw new Error("Stripe secret key is missing for this society.");
  }

  return new Stripe(normalized.secret_key);
};

export const createSocietyPaymentIntent = async ({ society, invoice }) => {
  const stripeConfig = normalizeStripeConfig(society?.stripe_config || {});

  if (!hasStripeConfig(stripeConfig)) {
    throw new Error("Stripe is not configured for this society.");
  }

  const stripe = createStripeClient(stripeConfig);
  const params = buildStripePaymentIntentParams({ society, invoice });
  const requestOptions = stripeConfig.connected_account_id
    ? { stripeAccount: stripeConfig.connected_account_id }
    : undefined;

  return await stripe.paymentIntents.create(params, requestOptions);
};

export const maskStripeConfig = (config = {}) => {
  const normalized = normalizeStripeConfig(config);

  return {
    publishable_key: normalized.publishable_key,
    secret_key: normalized.secret_key ? "********" : "",
    webhook_secret: normalized.webhook_secret ? "********" : "",
    connected_account_id: normalized.connected_account_id,
  };
};