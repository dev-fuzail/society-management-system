import test from "node:test";
import assert from "node:assert/strict";
import { resolveMaintenancePricing } from "./services/maintenanceBillingService.js";

test("resolveMaintenancePricing prefers society pricing module", () => {
  const society = {
    maintenance_config: { amount: 1000, currency: "PKR", due_day: 5 },
    pricing_modules: {
      maintenance: {
        enabled: true,
        amount: 2500,
        currency: "USD",
        due_day: 12,
        grace_period_days: 3,
        late_payment_charge: 50,
      },
    },
  };

  const pricing = resolveMaintenancePricing(society, new Date(2026, 5, 1));

  assert.equal(pricing.amount, 2500);
  assert.equal(pricing.currency, "USD");
  assert.equal(pricing.dueDay, 12);
  assert.equal(pricing.gracePeriodDays, 3);
  assert.equal(pricing.latePaymentCharge, 50);
});

test("resolveMaintenancePricing falls back to maintenance config", () => {
  const society = {
    maintenance_config: { amount: 1000, currency: "PKR", due_day: 5 },
    pricing_modules: {
      maintenance: {
        enabled: false,
      },
    },
  };

  const pricing = resolveMaintenancePricing(society, new Date(2026, 5, 1));

  assert.equal(pricing.amount, 1000);
  assert.equal(pricing.currency, "PKR");
  assert.equal(pricing.dueDay, 5);
});