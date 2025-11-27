// import crypto from "crypto";
// import Invite from "../models/Invite.js";
// import Society from "../models/Society.js";

// export const sendInvite = async (req, res) => {
//   try {
//     const { email, society_id, role } = req.body;

//     if (!email || !society_id)
//       return res.status(400).json({ message: "Email and society_id are required" });

//     const society = await Society.findById(society_id);
//     if (!society) return res.status(404).json({ message: "Society not found" });
//     // Generate unique invite token
//     const token = crypto.randomBytes(20).toString("hex");
//     const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // valid for 7 days

//     // Check if invite already exists for same email & society
//     const existingInvite = await Invite.findOne({ email, society_id, status: "pending" });
//     if (existingInvite)
//       return res.status(400).json({ message: "Invite already sent to this user" });

//     // Save invite
//     const invite = new Invite({
//       email,
//       society: society,
//       role: role || "resident",
//       token,
//       expiresAt,
//     });
//     await invite.save();
// console.log("✅ Invite created for:", email, invite);
//     // Generate frontend link (for example)
//     // const inviteLink = `${process.env.FRONTEND_URL}/join?society=${society_id}&token=${token}`;
//     const inviteLink = `http://${process.env.FRONTEND_URL}/join?society=${society_id}&token=${token}`;

//     return res.status(201).json({
//       success: true,
//       message: "Invite created successfully",
//       inviteLink,
//     });
//   } catch (error) {
//     console.error("❌ sendInvite error:", error);
//     res.status(500).json({ message: error.message });
//   }
// };

// export const verifyInvite = async (req, res) => {
//   try {
//     const { token } = req.query;

//     const invite = await Invite.findOne({ token });
//     if (!invite)
//       return res.status(404).json({ message: "Invalid invite token" });

//     if (invite.status !== "pending" || invite.expiresAt < new Date()) {
//       return res.status(400).json({ message: "Invite expired or already used" });
//     }

//     return res.status(200).json({
//       success: true,
//       message: "Invite verified successfully",
//       invite: {
//         email: invite.email,
//         society_id: invite.society_id,
//         role: invite.role,
//       },
//     });
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };

// export const registerFromInvite = async (req, res) => {
//   console.log("🔔 registerFromInvite called with body:", req.body);
//   try {
//     const { name, password, phone, token } = req.body;

//     const invite = await Invite.findOne({ token });
//     if (!invite || invite.status !== "pending")
//       return res.status(400).json({ message: "Invalid or used invite" });

//     if (invite.expiresAt < new Date())
//       return res.status(400).json({ message: "Invite has expired" });

//     // Create user
//     const hashedPassword = await bcrypt.hash(password, 10);
//     const user = new User({
//       name,
//       email: invite.email,
//       password: hashedPassword,
//       phone,
//       role: invite.role,
//       society_id: invite.society_id,
//     });

//     await user.save();

//     // Mark invite as accepted
//     invite.status = "accepted";
//     await invite.save();

//     return res.status(201).json({
//       success: true,
//       message: "User registered successfully via invite",
//       user,
//     });
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };
