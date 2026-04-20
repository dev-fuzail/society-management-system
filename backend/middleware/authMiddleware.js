import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || "secret123";

const normalizeRole = (role) => {
  if (!role) return role;
  if (role === "member") return "resident";
  if (role === "committee_member") return "resident";
  return role;
};

const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Not authorized, no token provided.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Fetch the full user object from DB and attach it to the request
    req.user = await User.findById(decoded.id).select('-password');

    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Not authorized, user not found.' });
    }

    // Backward compatibility for legacy role values used in older records.
    req.user.role = normalizeRole(req.user.role);

    next();
  } catch (error) {
    res.status(401).json({ success: false, message: 'Not authorized, token failed.' });
  }
};

export default authMiddleware;