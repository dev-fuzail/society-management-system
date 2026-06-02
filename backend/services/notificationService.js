import Notification from "../models/Notification.js";
import User from "../models/User.js";
import { sendFcmToTokens } from "./pushService.js";

const getUsersForNotification = async ({ userIds, societyId }) => {
  if (userIds && userIds.length > 0) {
    return User.find({ _id: { $in: userIds } }).select("_id fcm_tokens society_id");
  }

  if (societyId) {
    return User.find({ society_id: societyId }).select("_id fcm_tokens society_id");
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

  if (!users.length) {
    return { notifications: [], fcm: { sent: 0, failed: 0 } };
  }

  const notificationsToInsert = users.map((user) => ({
    user_id: user._id,
    society_id: societyId || user.society_id,
    type,
    title,
    message,
    data,
  }));

  const created = await Notification.insertMany(notificationsToInsert);

  if (io && sendSocket) {
    created.forEach((notification) => {
      io.to(`user_${notification.user_id}`).emit("notification:new", notification);
    });
  }

  let fcmResult = { sent: 0, failed: 0 };
  if (sendPush) {
    const tokens = users
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
