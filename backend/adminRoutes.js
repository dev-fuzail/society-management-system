import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
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

webRouter.get("/admin-dashboard", isAdminAuthenticated, async (req, res) => {
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

    res.render("admin-dashboard", {
      societyCount: allSocieties.length,
      totalUsersCount: totalUsers,
      societies: allSocieties,
      pageTitle: "Admin Dashboard",
    });
  } catch (error) {
    console.error("❌ Error fetching admin dashboard data:", error);
    res.status(500).send("Server Error: Could not load dashboard data.");
  }
});

webRouter.post(
  "/admin/society/:id/status",
  isAdminAuthenticated,
  async (req, res) => {
    const { id } = req.params;
    const { newStatus } = req.body; // Expects 'disabled' or 'active'
console.log(newStatus, id)
    if (!newStatus || !["active", "disabled"].includes(newStatus)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid status value." });
    }

    try {
      const society = await mongoose.model("Society").findByIdAndUpdate(
        id,
        { status: newStatus },
        { new: true } // Return the updated document
      );

      if (!society) {
        return res
          .status(404)
          .json({ success: false, message: "Society not found." });
      }

      // Redirect back to the dashboard or return JSON success (JSON is better for API)
      res.json({
        success: true,
        message: `Society status updated to ${newStatus}.`,
        society,
      });
    } catch (error) {
      console.error(`❌ Error updating society status for ${id}:`, error);
      res
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
                body { font-family: sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; background-color: #075E54; }
                .login-box { background: white; padding: 40px; border-radius: 8px; box-shadow: 0 10px 20px rgba(0,0,0,0.2); width: 350px; text-align: center;}
                h2 { color: #333; margin-bottom: 25px; }
                .error { color: #ff3b30; margin-bottom: 15px; font-weight: bold; }
                input[type="text"], input[type="password"] { width: 100%; padding: 12px; margin: 10px 0; border: 1px solid #ccc; border-radius: 6px; box-sizing: border-box; }
                button { background-color: #075E54; color: white; padding: 14px 20px; margin: 15px 0 0; border: none; border-radius: 6px; cursor: pointer; width: 100%; font-size: 16px; }
            </style>
        </head>
        <body>
            <div class="login-box">
                <h2>🔑 Admin Access</h2>
                ${error ? `<p class="error">${error}</p>` : ""}
                <form action="/admin-login" method="POST">
                    <input type="text" name="email" placeholder="Email" required>
                    <input type="password" name="password" placeholder="Password" required>
                    <button type="submit">Log In</button>
                </form>
            </div>
        </body>
        </html>
    `; // Note: I simplified the included HTML for brevity here, but your full HTML is still valid.
  res.send(loginPageHtml);
});

webRouter.post("/admin-login", (req, res) => {
  const { email, password } = req.body; // Check credentials against environment variables
  console.log("Admin login attempt:", req.body, email);
  if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
    req.session.isAdmin = true;
    return res.redirect("/admin-dashboard");
  } else {
    req.session.error = "Invalid credentials.";
    return res.redirect("/admin-login");
  }
});

webRouter.get("/admin-logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Error destroying session:", err);
    }
    res.redirect("/admin-login");
  });
});

webRouter.post("/admin/society/:id/delete", isAdminAuthenticated, async (req, res) => {
    const { id } = req.params;

    try {
        // 1. Find the society to get the list of members
        const societyToDelete = await mongoose.model('Society').findById(id);

        if (!societyToDelete) {
            return res.status(404).json({ success: false, message: "Society not found." });
        }

        // 2. Cascade Deletion: Delete all users whose IDs are in the members array
        const userDeleteResult = await mongoose.model('User').deleteMany({
            _id: { $in: societyToDelete.members } 
        });
        
        console.log(`[ADMIN DELETE]: Deleted ${userDeleteResult.deletedCount} users from society ID: ${id}`);

        // 3. Delete the society itself
        const societyDeleteResult = await mongoose.model('Society').findByIdAndDelete(id);

        if (!societyDeleteResult) {
             return res.status(404).json({ success: false, message: "Society could not be deleted." });
        }

        res.json({ 
            success: true, 
            message: `Society '${societyDeleteResult.name}' and ${userDeleteResult.deletedCount} associated users deleted successfully.`,
            deletedUsersCount: userDeleteResult.deletedCount
        });

    } catch (error) {
        console.error(`❌ Error deleting society and users for ${id}:`, error);
        res.status(500).json({ success: false, message: "Failed to perform cascading deletion." });
    }
});

export default webRouter;
