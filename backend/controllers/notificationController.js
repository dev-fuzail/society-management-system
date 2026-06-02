import Notification from "../models/Notification.js";
import User from "../models/User.js";
import { createAndSendNotification } from "../services/notificationService.js";
import { sendFcmToTokens } from "../services/pushService.js";

const sendResponse = (res, status, message, result, success = true) => {
  return res.status(status).json({
    status: success,
    success,
    message,
    result,
  });
};

export const registerDeviceToken = async (req, res) => {
  try {
    const { token, platform } = req.body;

    if (!token) {
      return sendResponse(res, 400, "Token is required.", null, false);
    }

    const user = await User.findById(req.user._id);
    const alreadyStored = user.fcm_tokens.some((entry) => entry.token === token);

    if (!alreadyStored) {
      user.fcm_tokens.push({ token, platform });
      await user.save();
    }

    return sendResponse(res, 200, "Device token registered.", {
      token,
      platform,
    });
  } catch (error) {
    return sendResponse(res, 500, "Failed to register device token.", null, false);
  }
};

export const removeDeviceToken = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return sendResponse(res, 400, "Token is required.", null, false);
    }

    await User.updateOne(
      { _id: req.user._id },
      { $pull: { fcm_tokens: { token } } }
    );

    return sendResponse(res, 200, "Device token removed.", { token });
  } catch (error) {
    return sendResponse(res, 500, "Failed to remove device token.", null, false);
  }
};

export const getNotifications = async (req, res) => {
  try {
    const { page = 1, limit = 20, type, unreadOnly } = req.query;
    const query = { user_id: req.user._id };

    if (type) {
      query.type = type;
    }

    if (unreadOnly === "true") {
      query.is_read = false;
    }

    const parsedLimit = Math.min(parseInt(limit, 10) || 20, 100);
    const parsedPage = Math.max(parseInt(page, 10) || 1, 1);
    const skip = (parsedPage - 1) * parsedLimit;

    const [items, total] = await Promise.all([
      Notification.find(query).sort({ created_at: -1 }).skip(skip).limit(parsedLimit),
      Notification.countDocuments(query),
    ]);

    return sendResponse(res, 200, "Notifications fetched.", {
      items,
      page: parsedPage,
      limit: parsedLimit,
      total,
    });
  } catch (error) {
    return sendResponse(res, 500, "Failed to fetch notifications.", null, false);
  }
};

export const markNotificationRead = async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, user_id: req.user._id },
      { is_read: true, read_at: new Date() },
      { new: true }
    );

    if (!notification) {
      return sendResponse(res, 404, "Notification not found.", null, false);
    }

    return sendResponse(res, 200, "Notification marked as read.", notification);
  } catch (error) {
    return sendResponse(res, 500, "Failed to update notification.", null, false);
  }
};

export const markAllRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { user_id: req.user._id, is_read: false },
      { is_read: true, read_at: new Date() }
    );

    return sendResponse(res, 200, "All notifications marked as read.", null);
  } catch (error) {
    return sendResponse(res, 500, "Failed to update notifications.", null, false);
  }
};

export const sendNotification = async (req, res) => {
  try {
    const { userIds, societyId, type, title, message, data, sendSocket, sendPush } = req.body;

    if (!type || !title || !message) {
      return sendResponse(res, 400, "Type, title, and message are required.", null, false);
    }

    if (userIds && userIds.length > 0 && req.user.role !== "admin") {
      const onlySelf = userIds.every((id) => id.toString() === req.user._id.toString());
      if (!onlySelf) {
        return sendResponse(res, 403, "Not authorized to notify other users.", null, false);
      }
    }

    const targetSocietyId = societyId || req.user.society_id;

    const result = await createAndSendNotification({
      io: req.io,
      userIds,
      societyId: targetSocietyId,
      type,
      title,
      message,
      data,
      sendSocket: sendSocket !== false,
      sendPush: sendPush !== false,
    });

    return sendResponse(res, 201, "Notification sent.", result);
  } catch (error) {
    return sendResponse(res, 500, "Failed to send notification.", null, false);
  }
};

export const getMyDeviceTokens = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("fcm_tokens");
    return sendResponse(res, 200, "Device tokens fetched.", {
      tokens: user?.fcm_tokens || [],
    });
  } catch (error) {
    return sendResponse(res, 500, "Failed to fetch device tokens.", null, false);
  }
};

export const sendTestPush = async (req, res) => {
  try {
    const { title, message, data } = req.body;

    if (!title || !message) {
      return sendResponse(res, 400, "Title and message are required.", null, false);
    }

    const user = await User.findById(req.user._id).select("fcm_tokens");
    const tokens = (user?.fcm_tokens || []).map((entry) => entry.token).filter(Boolean);

    if (!tokens.length) {
      return sendResponse(res, 404, "No device tokens found for user.", null, false);
    }

    const fcmResult = await sendFcmToTokens(tokens, {
      notification: {
        title,
        body: message,
      },
      data: data || {},
    });

    return sendResponse(res, 200, "Test push sent.", { fcm: fcmResult });
  } catch (error) {
    return sendResponse(res, 500, "Failed to send test push.", null, false);
  }
};
