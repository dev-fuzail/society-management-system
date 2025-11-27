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
      console.log("inside admin", society_name);

      if (!society_name || !society_address || !society_city) {
        return res.status(400).json({
          message: "Society name, address, and city are required",
        });
      }

      // Check for existing society by name + city + address
      const existingSociety = await Society.findOne({
        name: society_name,
        city: society_city,
        address: society_address,
      });

      if (existingSociety) {
        return res.status(400).json({
          message: "Society already exists in this location",
        });
      }

      // Create new society
      society = new Society({
        name: society_name,
        address: society_address,
        city: society_city,
      });
      await society.save();

      console.log("✅ Society created:", society.name);
    }

    // For Resident registration (joins existing society/apartment)
    if (role === "resident") {
      if (!society_id || !apartment_id)
        return res
          .status(400)
          .json({ message: "Society and apartment required for residents" });

      society = await Society.findById(society_id);
      if (!society)
        return res.status(404).json({ message: "Society not found" });

      const apartment = await Apartment.findById(apartment_id);
      if (!apartment)
        return res.status(404).json({ message: "Apartment not found" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      name,
      email,
      password: hashedPassword,
      phone,
      role,
      society_id: society ? society._id : society_id, // ✅ now guaranteed
      apartment_id,
    });

    await user.save();

    const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, {
      expiresIn: "7d",
    });

    return res.status(201).json({
      success: true,
      message: "User registered successfully",
      user,
      token,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
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
      return res
        .status(403)
        .json({
          status: false,
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
    const link = `${process.env.FRONTEND_URL}/join?token=${token}`;
    console.log('link----->: ', link);

    res
      .status(200)
      .json({
        status: true,
        message: "Invite link generated",
        result: { link },
      });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
};

// 📧 Send Email Invite
export const sendEmailInvite = async (req, res) => {
  console.log("request send email invite received", req.body, req.user);
  try {
    const { email } = req.body;
    const admin = await User.findById(req.user.id);
    if (!admin || admin.role !== "admin") {
      return res
        .status(403)
        .json({
          status: false,
          message: "Only admins can send invites.",
          result: null,
        });
    }

    // Check if an active invite already exists for this email
    const existingInvite = await SocietyInvite.findOne({
      email,
      society_id: admin.society_id,
      status: "pending",
    });
    if (existingInvite) {
      return res
        .status(400)
        .json({
          status: false,
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
      .json({ status: true, message: `Invite sent to ${email}`, result: null });
  } catch (error) {
    res
      .status(500)
      .json({ status: false, message: error.message, result: null });
  }
};

// 🕵️‍♂️ Verify Invite Token
export const verifyInvite = async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) {
      return res
        .status(400)
        .json({ status: false, message: "Invite token is required." });
    }

    const invite = await SocietyInvite.findOne({ token, status: "pending" });
    if (!invite) {
      return res
        .status(404)
        .json({
          status: false,
          message: "Invite not found or has already been used.",
        });
    }

    // Optionally, you can verify the JWT token's expiration here as well
    jwt.verify(token, JWT_SECRET);

    return res
      .status(200)
      .json({ status: true, message: "Invite verified.", result: { invite } });
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res
        .status(400)
        .json({ status: false, message: "Invite has expired." });
    }
    res.status(500).json({ status: false, message: error.message });
  }
};

// 📝 Register from Invite
export const registerFromInvite = async (req, res) => {
  console.log("request received in register from invite", req.body);
  try {
    const { name, password, phone, token, email } = req.body.data;

    const invite = await SocietyInvite.findOne({ token, status: "pending" });
    console.log('invite: ', invite);

    if (!invite) {
      return res
        .status(400)
        .json({ status: false, message: "Invalid or used invite token." });
    }

    // Use email from invite if it exists (secure), otherwise from user input.
    const userEmail = invite.email || email;
    if (!userEmail) {
      return res.status(400).json({ status: false, message: "Email is required for registration." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({
      name,
      email: userEmail,
      password: hashedPassword,
      phone,
      role: invite.role,
      society_id: invite.society_id,
    });
    console.log('user: ', user);
    
    await user.save();

    // Mark invite as accepted
    invite.status = "accepted";
    await invite.save();

    const authToken = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, {
      expiresIn: "7d",
    });

    return res
      .status(201)
      .json({
        status: true,
        message: "User registered successfully!",
        result: { authToken, user },
      });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
};

// 🔐 Login
export const login = async (req, res) => {
  console.log("request received", req.body);
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    const validPass = await bcrypt.compare(password, user.password);
    if (!validPass)
      return res.status(401).json({ message: "Invalid password" });

    const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, {
      expiresIn: "7d",
    });
    
    return res.status(200).json({
      status: true,
      message: "Login Successful!",
      result: {
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    // Generate token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(resetToken).digest("hex");

    // Save token and expiration to user
    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    await user.save();

    // Send email with token link
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}&email=${email}`;
    await sendResetEmail(email, resetUrl);

    res.status(200).json({ message: "Password reset link sent to email" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { email, token, newPassword } = req.body;
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      email,
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) return res.status(400).json({ message: "Invalid or expired token" });

    user.password = await bcrypt.hash(newPassword, 10);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;

    await user.save();

    res.status(200).json({ message: "Password has been reset successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const { name, phone, avatar } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (name) user.name = name;
    if (phone) user.phone = phone;
    if (avatar) user.avatar = avatar;

    await user.save();

    res.status(200).json({ message: "Profile updated successfully", user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
