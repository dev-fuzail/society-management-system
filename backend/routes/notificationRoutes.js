import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import {
  registerDeviceToken,
  removeDeviceToken,
  getNotifications,
  markNotificationRead,
  markAllRead,
  sendNotification,
} from "../controllers/notificationController.js";

const router = express.Router();

router.post("/device-token", authMiddleware, registerDeviceToken);
router.delete("/device-token", authMiddleware, removeDeviceToken);
router.get("/", authMiddleware, getNotifications);
router.patch("/read-all", authMiddleware, markAllRead);
router.patch("/:id/read", authMiddleware, markNotificationRead);
router.post("/", authMiddleware, sendNotification);

export default router;
