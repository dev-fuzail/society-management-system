import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";

dotenv.config();

const webRouter = express.Router();

const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

const isAdminAuthenticated = (req, res, next) => {
  if (req.session && req.session.isAdmin) {
    return next();
  }
  return res.redirect("/admin-login");
};

webRouter.get("/admin-dashboard", isAdminAuthenticated, async (_req, res) => {
  return res.sendFile(path.join(process.cwd(), "views", "admin-dashboard.html"));
});

webRouter.get("/admin/api/dashboard", isAdminAuthenticated, async (_req, res) => {
  try {
    const allSocieties = await mongoose.model("Society").aggregate([
      {
        $project: {
          _id: 1,
          name: 1,
          city: 1,
          total_apartments: 1,
          membersCount: { $size: "$members" },
          status: { $ifNull: ["$status", "active"] },
        },
      },
    ]);

    const totalUsers = await mongoose.model("User").countDocuments({});

    return res.status(200).json({
      success: true,
      result: {
        societyCount: allSocieties.length,
        totalUsersCount: totalUsers,
        societies: allSocieties,
      },
    });
  } catch (error) {
    console.error("❌ Error fetching admin dashboard data:", error);
    return res
      .status(500)
      .json({ success: false, message: "Could not load dashboard data." });
  }
});

webRouter.post(
  "/admin/society/:id/status",
  isAdminAuthenticated,
  async (req, res) => {
    const { id } = req.params;
    const { newStatus } = req.body;

    if (!newStatus || !["active", "disabled"].includes(newStatus)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid status value." });
    }

    try {
      const society = await mongoose.model("Society").findByIdAndUpdate(
        id,
        { status: newStatus },
        { new: true }
      );

      if (!society) {
        return res
          .status(404)
          .json({ success: false, message: "Society not found." });
      }

      return res.json({
        success: true,
        message: `Society status updated to ${newStatus}.`,
        society,
      });
    } catch (error) {
      console.error(`❌ Error updating society status for ${id}:`, error);
      return res
        .status(500)
        .json({ success: false, message: "Failed to update society status." });
    }
  }
);

webRouter.get("/admin-login", (req, res) => {
  const error = req.session.error;
  req.session.error = null;

  const loginPageHtml = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Super Admin Login</title>
            <style>
          :root { --brand:#2563eb; --brand2:#0ea5e9; --text:#0f172a; --muted:#64748b; --border:#cbd5e1; }
          body { font-family: "Segoe UI", Tahoma, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin:0; background: radial-gradient(circle at top left, #dbeafe 0%, #1e3a8a 45%, #0f172a 100%); }
          .login-shell { width: 100%; max-width: 420px; padding: 18px; }
          .login-box { background: rgba(255,255,255,0.97); padding: 34px; border-radius: 20px; box-shadow: 0 22px 48px rgba(0,0,0,0.34); text-align: center; border:1px solid #e2e8f0;}
          .badge { display:inline-block; font-size:11px; font-weight:800; letter-spacing:.6px; text-transform:uppercase; color:#1e3a8a; background:#e0ecff; border:1px solid #bfdbfe; padding:6px 10px; border-radius:999px; margin-bottom:14px; }
          h2 { color: var(--text); margin: 0 0 8px; }
          .sub { color: var(--muted); margin-bottom: 22px; font-size: 13px; }
          .error { color: #dc2626; background:#fee2e2; border:1px solid #fecaca; border-radius:8px; padding:9px; margin-bottom: 14px; font-weight: 700; }
          input[type="text"], input[type="password"] { width: 100%; padding: 12px; margin: 10px 0; border: 1px solid var(--border); border-radius: 10px; box-sizing: border-box; background:#f8fafc; }
          input:focus { outline: 2px solid #93c5fd; border-color:#60a5fa; }
          button { background: linear-gradient(120deg, var(--brand) 0%, var(--brand2) 100%); color: white; padding: 14px 20px; margin: 15px 0 0; border: none; border-radius: 10px; cursor: pointer; width: 100%; font-size: 16px; font-weight:700; }
          .footer { margin-top:14px; color:#64748b; font-size:12px; }
            </style>
        </head>
        <body>
        <div class="login-shell">
          <div class="login-box">
            <div class="badge">Secure Admin Portal</div>
            <h2>Admin Access</h2>
            <div class="sub">Sign in to manage platform societies</div>
            ${error ? `<p class="error">${error}</p>` : ""}
            <form action="/admin-login" method="POST">
              <input type="text" name="email" placeholder="Email" required>
              <input type="password" name="password" placeholder="Password" required>
              <button type="submit">Log In</button>
            </form>
            <div class="footer">Society Management Super Admin</div>
          </div>
            </div>
        </body>
        </html>
    `;

  res.send(loginPageHtml);
});

webRouter.post("/admin-login", (req, res) => {
  const { email, password } = req.body;

  if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
    req.session.isAdmin = true;
    return res.redirect("/admin-dashboard");
  }

  req.session.error = "Invalid credentials.";
  return res.redirect("/admin-login");
});

webRouter.get("/admin-logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Error destroying session:", err);
    }
    res.redirect("/admin-login");
  });
});

webRouter.get("/admin/api/elections", isAdminAuthenticated, async (_req, res) => {
  try {
    const Election = mongoose.model("Election");
    const elections = await Election.find().sort({ created_at: -1 }).select("_id title status start_date end_date society_id");
    return res.json({ success: true, result: elections });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

webRouter.post("/admin/api/elections/:id/force-complete", isAdminAuthenticated, async (req, res) => {
  try {
    const Election = mongoose.model("Election");
    const { publishElectionResults } = await import("./services/electionResultService.js");
    const election = await Election.findById(req.params.id);
    if (!election) return res.status(404).json({ success: false, message: "Election not found." });
    election.status = "completed";
    election.end_date = new Date();
    await election.save();
    const publication = await publishElectionResults(election, req.io);
    return res.json({ success: true, message: "Election force-completed and results published.", result: publication?.election || election });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

webRouter.get("/admin/api/withdrawals", isAdminAuthenticated, async (_req, res) => {
  try {
    const WithdrawalRequest = mongoose.model("WithdrawalRequest");
    const requests = await WithdrawalRequest.find()
      .populate("society_admin_id", "name email phone")
      .populate({ path: "wallet_id", populate: { path: "society_id", select: "name" } })
      .sort({ requested_at: -1 });

    return res.status(200).json({ success: true, result: requests });
  } catch (error) {
    console.error("❌ Error fetching withdrawal requests:", error);
    return res.status(500).json({ success: false, message: "Could not load withdrawal requests." });
  }
});

webRouter.post("/admin/withdrawals/:id/:action", isAdminAuthenticated, async (req, res) => {
  const { id, action } = req.params;
  const validActions = { approve: "approved", reject: "rejected", paid: "paid" };

  if (!validActions[action]) {
    return res.status(400).json({ success: false, message: "Invalid action." });
  }

  try {
    const WithdrawalRequest = mongoose.model("WithdrawalRequest");
    const Wallet = mongoose.model("Wallet");
    const Transaction = mongoose.model("Transaction");

    const withdrawal = await WithdrawalRequest.findById(id);
    if (!withdrawal) {
      return res.status(404).json({ success: false, message: "Withdrawal request not found." });
    }

    if (action === "paid") {
      if (withdrawal.status !== "approved") {
        return res.status(400).json({ success: false, message: "Withdrawal must be approved before it can be marked paid." });
      }

      const wallet = await Wallet.findById(withdrawal.wallet_id);
      if (!wallet || wallet.balance < withdrawal.amount) {
        return res.status(400).json({ success: false, message: "Insufficient wallet balance to fulfill this withdrawal." });
      }

      await Wallet.updateOne({ _id: wallet._id }, { $inc: { balance: -withdrawal.amount } });
      await Transaction.create({
        wallet_id: wallet._id,
        type: "debit",
        amount: withdrawal.amount,
        reference_type: "withdrawal",
        reference_id: withdrawal._id,
        status: "completed",
      });
    }

    withdrawal.status = validActions[action];
    withdrawal.processed_at = new Date();
    await withdrawal.save();

    return res.status(200).json({ success: true, message: `Withdrawal marked as ${validActions[action]}.`, result: withdrawal });
  } catch (error) {
    console.error(`❌ Error processing withdrawal ${id}:`, error);
    return res.status(500).json({ success: false, message: "Failed to process withdrawal request." });
  }
});

webRouter.post(
  "/admin/society/:id/delete",
  isAdminAuthenticated,
  async (req, res) => {
    const { id } = req.params;

    try {
      const societyToDelete = await mongoose.model("Society").findById(id);

      if (!societyToDelete) {
        return res.status(404).json({ success: false, message: "Society not found." });
      }

      const userDeleteResult = await mongoose.model("User").deleteMany({
        _id: { $in: societyToDelete.members },
      });

      console.log(
        `[ADMIN DELETE]: Deleted ${userDeleteResult.deletedCount} users from society ID: ${id}`
      );

      const societyDeleteResult = await mongoose
        .model("Society")
        .findByIdAndDelete(id);

      if (!societyDeleteResult) {
        return res
          .status(404)
          .json({ success: false, message: "Society could not be deleted." });
      }

      return res.json({
        success: true,
        message: `Society '${societyDeleteResult.name}' and ${userDeleteResult.deletedCount} associated users deleted successfully.`,
        deletedUsersCount: userDeleteResult.deletedCount,
      });
    } catch (error) {
      console.error(`❌ Error deleting society and users for ${id}:`, error);
      return res
        .status(500)
        .json({ success: false, message: "Failed to perform cascading deletion." });
    }
  }
);

// ─── TEST ROUTES ─────────────────────────────────────────────────────────────

webRouter.post("/admin/test/notify-all", isAdminAuthenticated, async (req, res) => {
  try {
    const { title = "Test Notification", message = "This is a test notification from the super admin." } = req.body;
    const { createAndSendNotification } = await import("./services/notificationService.js");
    const users = await mongoose.model("User").find({}).select("_id");
    const userIds = users.map((u) => u._id);

    const result = await createAndSendNotification({
      io: req.app.get("io"),
      userIds,
      type: "general",
      title,
      message,
      sendSocket: true,
      sendPush: true,
    });

    return res.json({ success: true, message: `Notification sent to ${userIds.length} users.`, result });
  } catch (error) {
    console.error("❌ Test notify-all error:", error);
    return res.status(500).json({ success: false, message: error.message || "Failed to send notifications." });
  }
});

webRouter.post("/admin/test/notify-society/:id", isAdminAuthenticated, async (req, res) => {
  const { id } = req.params;
  try {
    const { title = "Test Notification", message = "This is a test notification from the super admin." } = req.body;
    const { createAndSendNotification } = await import("./services/notificationService.js");

    const result = await createAndSendNotification({
      io: req.app.get("io"),
      societyId: id,
      type: "general",
      title,
      message,
      sendSocket: true,
      sendPush: true,
    });

    return res.json({ success: true, message: `Notification sent to society ${id}.`, result });
  } catch (error) {
    console.error("❌ Test notify-society error:", error);
    return res.status(500).json({ success: false, message: error.message || "Failed to send notification." });
  }
});

webRouter.post("/admin/test/payment/credit", isAdminAuthenticated, async (req, res) => {
  try {
    const { societyId, amount = 1000 } = req.body;
    if (!societyId) return res.status(400).json({ success: false, message: "societyId is required." });

    const txnAmt = Number(amount);
    if (!txnAmt || txnAmt <= 0) return res.status(400).json({ success: false, message: "amount must be a positive number." });

    const {
      getDirectAccessToken,
      validateCustomer,
      initiateTransaction,
    } = await import("./services/payfastService.js");

    const Wallet = mongoose.model("Wallet");
    const Transaction = mongoose.model("Transaction");

    const basketId = `INV-${societyId}-${Date.now()}`;

    // Idempotency guard
    const existing = await Transaction.findOne({ payfast_basket_id: basketId });
    if (existing) {
      const wallet = await Wallet.findById(existing.wallet_id);
      return res.json({ success: true, message: "Transaction already processed (idempotent).", basket_id: basketId, payfast_txn_id: existing.payfast_txn_id, wallet, transaction: existing });
    }

    // Step 1 — Get access token
    const token = await getDirectAccessToken("111.111.111.111");

    // Step 2 — Build shared payload
    const now = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    const orderDate = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

    const customerPayload = {
      basketId,
      txnAmt,
      orderDate,
      accountNumber: "12353940226802034243",
      cnicNumber: "4210131315089",
      customerMobileNo: "03001234567",
      customerEmailAddress: "test@test.com",
      accountTypeId: "3",
      bankCode: "JAZZ",
    };

    // Step 3 — Validate customer & get transaction_id
    const payfastTransactionId = await validateCustomer(token, customerPayload);

    // Step 4 — Initiate transaction with OTP
    const pfResponse = await initiateTransaction(token, {
      ...customerPayload,
      otp: "123456",
      transactionId: payfastTransactionId,
    });

    console.log("[PAYFAST TEST CREDIT] Response:", JSON.stringify(pfResponse));

    if (pfResponse?.status_code !== "00") {
      return res.status(400).json({
        success: false,
        message: pfResponse?.status_message || pfResponse?.error_description || "PayFast transaction failed.",
        payfast_response: pfResponse,
      });
    }

    // Step 5 — Credit wallet
    let wallet = await Wallet.findOne({ society_id: societyId });
    if (!wallet) {
      wallet = await Wallet.create({ society_id: societyId, balance: 0, currency: "PKR" });
    }

    await Wallet.updateOne({ _id: wallet._id }, { $inc: { balance: txnAmt } });

    const tx = await Transaction.create({
      wallet_id: wallet._id,
      type: "credit",
      amount: txnAmt,
      reference_type: "invoice",
      reference_id: wallet._id,
      status: "completed",
      payfast_basket_id: basketId,
      payfast_txn_id: pfResponse.transaction_id || payfastTransactionId,
    });

    const updated = await Wallet.findById(wallet._id);

    return res.json({
      success: true,
      message: "Payment processed and wallet credited.",
      basket_id: basketId,
      payfast_txn_id: tx.payfast_txn_id,
      wallet: updated,
      transaction: tx,
    });
  } catch (error) {
    console.error("❌ Test credit (PayFast) error:", error);
    const isEndpointError = error.message?.includes("Expected JSON but got");
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to process payment.",
      hint: isEndpointError
        ? "The PayFast direct API URL is wrong for this sandbox. Set PAYFAST_DIRECT_BASE_URL in backend/.env to the correct base URL (e.g. https://ipguat.apps.net.pk/Ecommerce/api or a different host provided by PayFast)."
        : undefined,
    });
  }
});

webRouter.post("/admin/test/payment/debit", isAdminAuthenticated, async (req, res) => {
  try {
    const { societyId, amount = 500, note = "Test debit from super admin" } = req.body;
    if (!societyId) return res.status(400).json({ success: false, message: "societyId is required." });

    const Wallet = mongoose.model("Wallet");
    const Transaction = mongoose.model("Transaction");

    const wallet = await Wallet.findOne({ society_id: societyId });
    if (!wallet) return res.status(404).json({ success: false, message: "Wallet not found for this society." });

    if (wallet.balance < Number(amount)) {
      return res.status(400).json({ success: false, message: `Insufficient balance. Current: ${wallet.balance}, Requested: ${amount}` });
    }

    await Wallet.updateOne({ _id: wallet._id }, { $inc: { balance: -Number(amount) } });
    const tx = await Transaction.create({
      wallet_id: wallet._id,
      type: "debit",
      amount: Number(amount),
      reference_type: "withdrawal",
      reference_id: wallet._id,
      status: "completed",
    });

    const updated = await Wallet.findById(wallet._id);
    return res.json({ success: true, message: `Debited ${amount} from society wallet.`, wallet: updated, transaction: tx });
  } catch (error) {
    console.error("❌ Test debit error:", error);
    return res.status(500).json({ success: false, message: error.message || "Failed to debit wallet." });
  }
});

// ─── Verified PayFast Payments (live status from sandbox) ────────────────────

webRouter.get("/admin/api/payfast/transactions", isAdminAuthenticated, async (req, res) => {
  try {
    const Transaction = mongoose.model("Transaction");
    const Wallet = mongoose.model("Wallet");

    // Fetch all transactions that went through PayFast (have a basket_id)
    const localTxns = await Transaction.find({ payfast_basket_id: { $exists: true, $ne: null } })
      .populate({ path: "wallet_id", populate: { path: "society_id", select: "name" } })
      .sort({ created_at: -1 })
      .lean();

    if (!localTxns.length) {
      return res.json({ success: true, result: [], message: "No PayFast transactions found." });
    }

    // Attempt to get a direct API token to verify each transaction live from PayFast
    let directToken = null;
    let directApiAvailable = false;
    let directApiError = null;

    try {
      const { getDirectAccessToken } = await import("./services/payfastService.js");
      directToken = await getDirectAccessToken("111.111.111.111");
      directApiAvailable = true;
    } catch (err) {
      directApiError = err.message;
      console.warn("[PAYFAST] Direct API unavailable for status lookups:", err.message);
    }

    // For each transaction, try to fetch live status from PayFast
    const { getTransactionByBasketId } = await import("./services/payfastService.js");

    const results = await Promise.all(
      localTxns.map(async (txn) => {
        const base = {
          local_id: txn._id,
          basket_id: txn.payfast_basket_id,
          payfast_txn_id: txn.payfast_txn_id,
          amount: txn.amount,
          type: txn.type,
          local_status: txn.status,
          society: txn.wallet_id?.society_id?.name || "Unknown",
          created_at: txn.created_at,
        };

        if (!directApiAvailable || !directToken) {
          return { ...base, payfast_status: null, payfast_verified: false, payfast_error: directApiError };
        }

        try {
          const pfData = await getTransactionByBasketId(
            directToken,
            txn.payfast_basket_id,
            txn.created_at
              ? new Date(txn.created_at).toISOString().slice(0, 10)
              : undefined
          );
          return {
            ...base,
            payfast_status_code: pfData.status_code,
            payfast_status_msg: pfData.status_msg || pfData.status_message,
            payfast_txn_id_live: pfData.transaction_id,
            payfast_verified: pfData.status_code === "00",
            payfast_raw: pfData,
          };
        } catch (err) {
          return { ...base, payfast_status: null, payfast_verified: false, payfast_error: err.message };
        }
      })
    );

    return res.json({
      success: true,
      direct_api_available: directApiAvailable,
      direct_api_error: directApiError || null,
      result: results,
    });
  } catch (error) {
    console.error("❌ PayFast transactions fetch error:", error);
    return res.status(500).json({ success: false, message: error.message || "Failed to fetch PayFast transactions." });
  }
});

export default webRouter;
