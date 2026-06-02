import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import {
  registerDeviceToken,
  removeDeviceToken,
  getNotifications,
  markNotificationRead,
  markAllRead,
  sendNotification,
  getMyDeviceTokens,
  sendTestPush,
} from "../controllers/notificationController.js";

const router = express.Router();

router.post("/device-token", authMiddleware, registerDeviceToken);
router.delete("/device-token", authMiddleware, removeDeviceToken);
router.get("/", authMiddleware, getNotifications);
router.get("/debug/tokens", authMiddleware, getMyDeviceTokens);
router.post("/debug/test-push", authMiddleware, sendTestPush);
router.patch("/read-all", authMiddleware, markAllRead);
router.patch("/:id/read", authMiddleware, markNotificationRead);
router.post("/", authMiddleware, sendNotification);

export default router;
