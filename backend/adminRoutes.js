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

export default webRouter;
