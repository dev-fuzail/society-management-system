import express from 'express';
import {
    generateInviteLink,
    login,
    register,
    registerFromInvite,
    sendEmailInvite,
    verifyInvite,
    forgotPassword,
    resetPassword,
    updateProfile

} from '../controllers/authController.js';
import authMiddleware from '../middleware/authMiddleware.js';
const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/verify-invite', verifyInvite); // Changed from /verify
router.post('/register-from-invite', registerFromInvite);
router.post('/generate-invite', authMiddleware, generateInviteLink);
router.post('/send-email', authMiddleware, sendEmailInvite);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.put("/update-profile", authMiddleware, updateProfile);

export default router;
