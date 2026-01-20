import bcrypt from "bcryptjs";
import crypto from "crypto";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import Apartment from "../models/Apartment.js";
import Society from "../models/Society.js";
import SocietyInvite from "../models/SocietyInvite.js";
import User from "../models/User.js";
import { sendInviteEmail } from "../utils/mailer.js"; // We will create this utility
import { sendResetEmail } from "../utils/mailer.js";
import { send2FAEmail } from '../utils/mailer.js';

const JWT_SECRET = process.env.JWT_SECRET || "secret123";
dotenv.config();

// 🧍‍♂️ Register (Admin or Resident)
export const register = async (req, res) => {
  console.log("request received", req.body);
  try {
    const {
      name,
      email,
      password,
      role,
      phone,
      society_id,
      apartment_id,
      society_name,
      society_address,
      society_city,
    } = req.body;

    let society = null;

    // For Admin registration (first user → creates society)
    if (role === "admin") {
      if (!society_name || !society_address || !society_city) {
        return res.status(400).json({
          success: false,
          message: "Society name, address, and city are required for admin registration.",
        });
      }

      const existingSociety = await Society.findOne({
        name: society_name,
        city: society_city,
        address: society_address,
      });

      if (existingSociety) {
        return res.status(400).json({
          success: false,
          message: "A society with this name and location already exists.",
        });
      }

      // Create new society
      society = new Society({
        name: society_name,
        address: society_address,
        city: society_city,
        admins: [],
        members: [],
      });
      await society.save();
      console.log("✅ Society created:", society.name);
    }

    // For Resident registration
    if (role === "resident") {
      if (!society_id || !apartment_id) {
        return res
          .status(400)
          .json({ success: false, message: "Society and apartment are required for resident registration." });
      }

      society = await Society.findById(society_id);
      if (!society)
        return res.status(404).json({ success: false, message: "Society not found." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      name,
      email,
      password: hashedPassword,
      phone,
      role,
      society_id: society ? society._id : society_id,
      apartment_id: apartment_id || null, // save apartment if provided
    });

    await user.save();

    // 🔹 Add user to society arrays
    if (society) {
      if (role === "admin") {
        society.admins.push(user._id);
        society.members.push(user._id); // admin is also a member
      } else if (role === "resident") {
        society.members.push(user._id);
      }
      await society.save();
    }

    const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, {
      expiresIn: "7d",
    });

    return res.status(201).json({
      success: true,
      message: "User registered successfully",
      result: {
        user,
        token,
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 🔗 Generate Invite Link
export const generateInviteLink = async (req, res) => {
  console.log("request invite generate received", req.user);
  try {
    // Assuming user is authenticated and user ID is available in req.user
    const admin = await User.findById(req.user.id);
    console.log("admin: ", admin.society_id);

    if (!admin || admin.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Only admins can generate invite links.",
      });
    }

    const token = jwt.sign(
      { society_id: admin.society_id, role: "member" },
      JWT_SECRET,
      { expiresIn: "7d" }
    );
    console.log("token: ", token);

    const invite = new SocietyInvite({
      society_id: admin.society_id,
      role: "member",
      token: token,
      status: "pending",
      // expires_at can be set based on token's exp
    });
    await invite.save();

    // Replace with your frontend URL
    // const link = `${process.env.FRONTEND_URL}/join?token=${token}`;
    const link = `${process.env.BACKEND_URL}/join?token=${token}`;
    console.log("link----->: ", link, "<>----", process.env.BACKEND_URL);

    res.status(200).json({
      success: true,
      message: "Invite link generated",
      result: { link },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 📧 Send Email Invite
export const sendEmailInvite = async (req, res) => {
  console.log("request send email invite received", req.body, req.user);
  try {
    const { email } = req.body;
    const admin = await User.findById(req.user.id);
    if (!admin || admin.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Only admins can send invites.",
        result: null,
      });
    }

    // Check if an active invite already exists for this email
    // console.log("Incoming token:", token);
    // const invite = await SocietyInvite.findOne({ token, status: "pending" });

    const existingInvite = await SocietyInvite.findOne({
      email,
      society_id: admin.society_id,
      status: "pending",
    });
    console.log("Invite from DB:", existingInvite);

    if (existingInvite) {
      return res.status(400).json({
        success: false,
        message: "An active invite has already been sent to this email.",
        result: null,
      });
    }

    const token = jwt.sign(
      { society_id: admin.society_id, email, role: "member" },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    const invite = new SocietyInvite({
      society_id: admin.society_id,
      email,
      role: "member",
      token,
      status: "pending",
      // expires_at could be added here if needed
    });
    await invite.save();

    await sendInviteEmail(email, token); // This function will use nodemailer

    res
      .status(200)
      .json({ success: true, message: `Invite sent to ${email}` });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: error.message });
  }
};

// 🕵️‍♂️ Verify Invite Token
export const verifyInvite = async (req, res) => {
  try {
    const { token } = req.query;
    console.log("Request received token:", token);

    if (!token) {
      return res
        .status(400)
        .json({ success: false, message: "Invite token is required." });
    }

    // Verify JWT first
    let payload;
    try {
      payload = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      if (err.name === "TokenExpiredError") {
        return res
          .status(400)
          .json({ success: false, message: "Invite has expired." });
      }
      return res
        .status(400)
        .json({ success: false, message: "Invalid invite token." });
    }

    // Then fetch invite from DB
    const invite = await SocietyInvite.findOne({ token, status: "pending" });
    console.log("Invite from DB:", invite);

    if (!invite) {
      return res
        .status(404)
        .json({ success: false, message: "Invite not found or already used." });
    }

    return res
      .status(200)
      .json({ success: true, message: "Invite verified.", result: { invite } });
  } catch (error) {
    console.error("Verify invite error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 📝 Register from Invite
export const registerFromInvite = async (req, res) => {
  console.log("request received in register from invite", req.body);
  try {
    const { name, password, phone, token, email } = req.body;

    // Check invite
    const invite = await SocietyInvite.findOne({ token });
    console.log('invite: ', invite);

    if (!invite) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid or used invite token." });
    }

    // Determine email
    const userEmail = invite.email || email;
    if (!userEmail) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Email is required for registration.",
        });
    }

    // Hash password & create user
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({
      name,
      email: userEmail,
      password: hashedPassword,
      phone,
      role: invite.role, // member
      society_id: invite.society_id,
    });
    await user.save();

    // 🔹 Add user to society members array
    const society = await Society.findById(invite.society_id);
    if (society) {
      // Check if user already exists in members (avoid duplicates)
      if (!society.members.includes(user._id)) {
        society.members.push(user._id);
        await society.save();
      }
    }

    // Mark invite as accepted
    invite.status = "accepted";
    await invite.save();

    // JWT token
    const authToken = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, {
      expiresIn: "7d",
    });

    return res.status(201).json({
      success: true,
      message: "User registered successfully!",
      result: {
        user,
        token: authToken,
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 🔐 Login
export const login = async (req, res) => {
  console.log("request received", req.body);
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    const validPass = await bcrypt.compare(password, user.password);
    if (!validPass)
      return res.status(401).json({ success: false, message: "Invalid password" });

    // const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, {
    //   expiresIn: "7d",
    // });

    // return res.status(200).json({
    //   success: true,
    //   message: "Login Successful!",
    //   result: {
    //     token,
    //     user: {
    //       id: user._id,
    //       name: user.name,
    //       email: user.email,
    //       role: user.role,
    //     },
    //   },
    // });

    if (user.isTwoFactorEnabled) {
      // 1. Generate 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      
      user.twoFactorCode = otp;
      user.twoFactorCodeExpires = Date.now() + 10 * 60 * 1000; // 10 mins
      await user.save();

      // 3. Send Email
      await send2FAEmail(user.email, otp);

      // 4. Return special response telling Frontend to show OTP screen
      return res.status(200).json({
        success: true,
        require2FA: true, 
        userId: user._id, // Frontend needs this to send back with OTP
        message: "OTP sent to email"
      });
    }

    // 🟢 Normal Login (If 2FA is OFF)
    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
    
    return res.status(200).json({
      success: true,
      token,
      user: { id: user._id, name: user.name, role: user.role }
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// export const forgotPassword = async (req, res) => {
//   try {
//     const { email } = req.body;
//     const user = await User.findOne({ email });
//     if (!user) return res.status(404).json({ message: "User not found" });

//     // Generate token
//     const resetToken = crypto.randomBytes(32).toString("hex");
//     const hashedToken = crypto
//       .createHash("sha256")
//       .update(resetToken)
//       .digest("hex");

//     // Save token and expiration to user
//     user.resetPasswordToken = hashedToken;
//     user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
//     await user.save();

//     // Send email with token link
//     const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}&email=${email}`;
//     await sendResetEmail(email, resetUrl);

//     res.status(200).json({ message: "Password reset link sent to email" });
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };

export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    const resetToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    await user.save();

    // This URL will be opened on mobile app or web
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}&email=${email}`;

    await sendResetEmail(email, resetUrl);

    res.status(200).json({
      success: true,
      message: "Password reset link sent to email",
      result: { resetUrl },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const resetPassword = async (req, res) => {
  // try {
  //   const { email, token, newPassword } = req.body;
  //   const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

  //   const user = await User.findOne({
  //     email,
  //     resetPasswordToken: hashedToken,
  //     resetPasswordExpires: { $gt: Date.now() },
  //   });

  //   if (!user)
  //     return res.status(400).json({ message: "Invalid or expired token" });

  //   user.password = await bcrypt.hash(newPassword, 10);
  //   user.resetPasswordToken = undefined;
  //   user.resetPasswordExpires = undefined;

  //   await user.save();

  //   res.status(200).json({ message: "Password has been reset successfully" });
  // } catch (error) {
  //   res.status(500).json({ message: error.message });
  // }

  try {
    const { token, email, newPassword } = req.body;

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
    const user = await User.findOne({
      email,
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user)
      return res
        .status(400)
        .json({ success: false, message: "Invalid or expired token" });

    // Update password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);

    // Clear reset token fields
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res
      .status(200)
      .json({ success: true, message: "Password reset successful" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const { name, phone, avatar } = req.body;
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ message: "User not found" });

    if (name) user.name = name;
    if (phone) user.phone = phone;
    if (avatar) user.avatar = avatar;

    await user.save();

    res.status(200).json({ success: true, message: "Profile updated successfully", result: { user } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const verify2FALogin = async (req, res) => {
  const { userId, otp } = req.body;

  try {
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Check if OTP matches and hasn't expired
    if (user.twoFactorCode !== otp || user.twoFactorCodeExpires < Date.now()) {
      return res.status(400).json({ success: false, message: "Invalid or expired OTP" });
    }

    // ✅ OTP is valid: Generate Token
    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });

    // Clear the OTP fields
    user.twoFactorCode = undefined;
    user.twoFactorCodeExpires = undefined;
    await user.save();

    res.status(200).json({
      success: true,
      token,
      user: { id: user._id, name: user.name, role: user.role }
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const toggle2FA = async (req, res) => {
  // req.user comes from your authMiddleware
  const { enable } = req.body; // Boolean: true to enable, false to disable

  try {
    const user = await User.findById(req.user._id);
    user.isTwoFactorEnabled = enable;
    await user.save();

    res.status(200).json({ 
      success: true, 
      message: `2FA ${enable ? 'enabled' : 'disabled'} successfully.` 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};