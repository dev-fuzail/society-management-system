import Notification from "../models/Notification.js";
import User from "../models/User.js";
import { sendFcmToTokens } from "./pushService.js";

const preferenceMap = {
  announcement: "announcements",
  announcement_important: "announcements",
  announcement_emergency: "general_society_updates",
  election: "elections",
  election_result: "elections",
  maintenance_reminder: "maintenance_reminders",
  visitor_notification: "visitor_notifications",
  payment: "payment_notifications",
  payment_status: "payment_notifications",
  general: "general_society_updates",
  society_update: "general_society_updates",
};

const shouldDeliverToUser = (user, type) => {
  const preferenceKey = preferenceMap[type] || "general_society_updates";
  const preferences = user.notification_preferences || {};
  if (preferences[preferenceKey] === false) {
    return false;
  }
  return true;
};

const getUsersForNotification = async ({ userIds, societyId }) => {
  if (userIds && userIds.length > 0) {
    return User.find({ _id: { $in: userIds } }).select("_id fcm_tokens society_id notification_preferences");
  }

  if (societyId) {
    return User.find({ society_id: societyId }).select("_id fcm_tokens society_id notification_preferences");
  }

  return [];
};

export const createAndSendNotification = async ({
  io,
  userIds,
  societyId,
  type,
  title,
  message,
  data,
  sendSocket = true,
  sendPush = true,
}) => {
  const users = await getUsersForNotification({ userIds, societyId });
  const eligibleUsers = users.filter((user) => shouldDeliverToUser(user, type));

  if (!eligibleUsers.length) {
    return { notifications: [], fcm: { sent: 0, failed: 0 } };
  }

  const notificationsToInsert = eligibleUsers.map((user) => ({
    user_id: user._id,
    society_id: societyId || user.society_id,
    type,
    title,
    message,
    data,
    delivery_status: "sent",
    delivered_at: new Date(),
  }));

  const created = await Notification.insertMany(notificationsToInsert);

  if (io && sendSocket) {
    created.forEach((notification) => {
      io.to(`user_${notification.user_id}`).emit("notification:new", notification);
    });
  }

  let fcmResult = { sent: 0, failed: 0 };
  if (sendPush) {
    const tokens = eligibleUsers
      .flatMap((user) => user.fcm_tokens || [])
      .map((entry) => entry.token)
      .filter(Boolean);

    if (tokens.length > 0) {
      fcmResult = await sendFcmToTokens(tokens, {
        notification: {
          title,
          body: message,
        },
        data: data || {},
      });
    }
  }

  return { notifications: created, fcm: fcmResult };
};
