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
  injectDeviceToken,
  getNotificationPreferences,
  updateNotificationPreferences,
  getNotificationAnalytics,
} from "../controllers/notificationController.js";

const router = express.Router();

router.post("/device-token", authMiddleware, registerDeviceToken);
router.delete("/device-token", authMiddleware, removeDeviceToken);
router.get("/", authMiddleware, getNotifications);
router.get("/debug/tokens", authMiddleware, getMyDeviceTokens);
router.post("/debug/test-push", authMiddleware, sendTestPush);
router.post("/debug/inject-token", authMiddleware, injectDeviceToken);
router.get("/preferences", authMiddleware, getNotificationPreferences);
router.put("/preferences", authMiddleware, updateNotificationPreferences);
router.get("/analytics", authMiddleware, getNotificationAnalytics);
router.patch("/read-all", authMiddleware, markAllRead);
router.patch("/:id/read", authMiddleware, markNotificationRead);
router.post("/", authMiddleware, sendNotification);

export default router;
