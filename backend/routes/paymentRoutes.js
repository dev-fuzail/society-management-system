import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import {
  initiatePayfastCheckout,
  handlePayfastIpn,
  payfastSuccess,
  payfastFailure,
  getWalletSummary,
  getWalletReport,
  addManualEntry,
  createWithdrawalRequest,
  getSocietyWithdrawalRequests,
  getSocietyBankAccount,
  updateSocietyBankAccount,
  submitOfflinePayment,
  getOfflinePayments,
  reviewOfflinePayment,
} from "../controllers/paymentController.js";

const router = express.Router();

// PayFast hosted-checkout redirect flow (browser-facing, unauthenticated)
router.get("/payfast/checkout/:invoiceId", initiatePayfastCheckout);
router.get("/payfast/ipn", handlePayfastIpn);
router.get("/payfast/success", payfastSuccess);
router.get("/payfast/failure", payfastFailure);

// Wallet / withdrawal ledger (authenticated)
router.get("/wallets/:societyId", authMiddleware, getWalletSummary);
router.get("/wallets/:societyId/report", authMiddleware, getWalletReport);
router.post("/wallets/:societyId/manual-entry", authMiddleware, addManualEntry);
router.post("/withdrawals", authMiddleware, createWithdrawalRequest);
router.get("/withdrawals/society/:societyId", authMiddleware, getSocietyWithdrawalRequests);

// Bank account (admin sets, all members can read)
router.get("/bank-account/:societyId", authMiddleware, getSocietyBankAccount);
router.put("/bank-account/:societyId", authMiddleware, updateSocietyBankAccount);

// Offline / manual payments
router.post("/offline", authMiddleware, submitOfflinePayment);
router.get("/offline/society/:societyId", authMiddleware, getOfflinePayments);
router.patch("/offline/:id/review", authMiddleware, reviewOfflinePayment);

export default router;
