import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || "secret123";

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ status: false, message: 'Access denied. No token provided.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // Adds the user payload (e.g., { id, role }) to the request object
    next();
  } catch (error) {
    res.status(401).json({ status: false, message: 'Invalid token.' });
  }
};

export default authMiddleware;