import dotenv from "dotenv";
import nodemailer from "nodemailer";
dotenv.config();

// Create a transporter object using SMTP transport
// It reads the configuration from your backend's .env file
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || "587", 10),
  secure: parseInt(process.env.SMTP_PORT || "587", 10) === 465, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/**
 * Sends an invitation email to a new user.
 * @param {string} email - The recipient's email address.
 * @param {string} token - The unique invitation token.
 */
export const sendInviteEmail = async (email, token) => {
  // Construct the invitation link using the frontend URL from your .env
  // const inviteLink = `${process.env.FRONTEND_URL}/join?token=${token}`;
  const inviteLink = `${process.env.BACKEND_URL}/join?token=${token}`;

  const mailOptions = {
    from: process.env.SMTP_FROM,
    to: email,
    subject: "You are invited to join our Society!",
    text: `Hello,\n\nYou have been invited to join our society. Please click the link below to register:\n${inviteLink}\n\nIf you did not request this, please ignore this email.\n`,
    html: `
      <div style="font-family: sans-serif; padding: 20px; color: #333;">
        <h2>Invitation to Join Our Society</h2>
        <p>Hello,</p>
        <p>You have been invited to join our society. Please click the button below to complete your registration.</p>
        <a href="${inviteLink}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Join Now</a>
        <p style="margin-top: 20px;">If you did not request this, please ignore this email.</p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
  console.log(`✅ Invitation email sent to ${email}`);
};

/**
 * Sends a welcome email to a new user.
 * @param {string} email - The recipient's email address.
 * @param {string} name - The user's name.
 */
export const sendWelcomeEmail = async (email, name) => {
  const mailOptions = {
    from: process.env.SMTP_FROM,
    to: email,
    subject: 'Welcome to Our Society Management Platform!',
    text: `Hello ${name},\n\nWelcome! Your account has been successfully created. You can now log in to the app.\n\nThank you for joining us!`,
    html: `
      <div style="font-family: sans-serif; padding: 20px; color: #333;">
        <h2>Welcome, ${name}!</h2>
        <p>Your account has been successfully created on our Society Management Platform.</p>
        <p>You can now log in to the app and explore all the features available to you.</p>
        <p style="margin-top: 20px;">Thank you for joining us!</p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
  console.log(`✅ Welcome email sent to ${email}`);
};

// ✅ Send reset password email
export const sendResetEmail = async (email, link) => {
  const mailOptions = {
    from: process.env.SMTP_FROM,
    to: email,
    subject: "Password Reset Request",
    html: `
      <div style="font-family: sans-serif; padding: 20px; color: #333;">
        <h2>Password Reset Request</h2>
        <p>You requested to reset your password. Click the button below to reset it:</p>
        <a href="${link}" style="background-color:#dc3545;color:white;padding:10px 20px;text-decoration:none;border-radius:5px;">Reset Password</a>
        <p>If you did not request this, ignore this email.</p>
      </div>
    `,
  };
  await transporter.sendMail(mailOptions);
  console.log(`✅ Reset password email sent to ${email} ${link}`);
};

/**
 * Sends a 2FA OTP email to the user.
 * @param {string} email - The recipient's email address.
 * @param {string} otp - The 6-digit OTP code.
 */
export const send2FAEmail = async (email, otp) => {
  const mailOptions = {
    from: process.env.SMTP_FROM,
    to: email,
    subject: "Your Login Verification Code",
    text: `Your verification code is ${otp}. It is valid for 10 minutes.`,
    html: `
      <div style="font-family: sans-serif; padding: 20px; color: #333;">
        <h2>Login Verification</h2>
        <p>Your 2FA code is:</p>
        <h1 style="color: #007bff; letter-spacing: 5px;">${otp}</h1>
        <p>This code expires in 10 minutes.</p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
  console.log(`✅ 2FA OTP sent to ${email}`);
};