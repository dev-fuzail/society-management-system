import test from "node:test";
import assert from "node:assert/strict";
import { buildStripePaymentIntentParams, hasStripeConfig, maskStripeConfig, normalizeStripeConfig } from "./services/stripeService.js";

const society = {
  _id: "society123",
  name: "Green Valley",
  maintenance_config: { currency: "PKR" },
};

const invoice = {
  _id: "invoice123",
  user_id: "user123",
  apartment_id: "apt123",
  amount: 2500,
  currency: "PKR",
  type: "maintenance",
  period_key: "2026-06",
};

test("normalizeStripeConfig trims values", () => {
  const normalized = normalizeStripeConfig({
    publishable_key: "  pk_test_123  ",
    secret_key: " sk_test_456 ",
    webhook_secret: " whsec_789 ",
    connected_account_id: " acct_abc ",
  });

  assert.equal(normalized.publishable_key, "pk_test_123");
  assert.equal(normalized.secret_key, "sk_test_456");
  assert.equal(normalized.webhook_secret, "whsec_789");
  assert.equal(normalized.connected_account_id, "acct_abc");
});

test("hasStripeConfig requires publishable and secret keys", () => {
  assert.equal(hasStripeConfig({ publishable_key: "pk_test_123", secret_key: "sk_test_456" }), true);
  assert.equal(hasStripeConfig({ publishable_key: "pk_test_123" }), false);
});

test("buildStripePaymentIntentParams converts amount and metadata", () => {
  const params = buildStripePaymentIntentParams({ society, invoice });

  assert.equal(params.amount, 250000);
  assert.equal(params.currency, "pkr");
  assert.equal(params.metadata.invoiceId, "invoice123");
  assert.equal(params.metadata.societyId, "society123");
});

test("maskStripeConfig hides secret values", () => {
  const masked = maskStripeConfig({
    publishable_key: "pk_test_123",
    secret_key: "sk_test_456",
    webhook_secret: "whsec_789",
    connected_account_id: "acct_abc",
  });

  assert.equal(masked.secret_key, "********");
  assert.equal(masked.webhook_secret, "********");
  assert.equal(masked.publishable_key, "pk_test_123");
});