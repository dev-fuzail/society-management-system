import User from "../models/User.js";
import { createAndSendNotification } from "./notificationService.js";

const SHORT_MESSAGE_LENGTH = 120;

const getShortDescription = (message) => {
  if (!message) return "";
  const normalized = message.replace(/\s+/g, " ").trim();

  if (normalized.length <= SHORT_MESSAGE_LENGTH) {
    return normalized;
  }

  return `${normalized.slice(0, SHORT_MESSAGE_LENGTH - 3)}...`;
};

export const normalizeAnnouncementFlags = ({ category, is_important }) => {
  const normalizedCategory = ["general", "important", "emergency"].includes(category)
    ? category
    : "general";

  return {
    category: normalizedCategory,
    is_important: Boolean(is_important) || normalizedCategory === "important" || normalizedCategory === "emergency",
  };
};

export const notifyAnnouncementPublished = async ({
  io,
  announcement,
  reason = "created",
}) => {
  const recipients = await User.find({
    society_id: announcement.society_id,
  }).select("_id");

  const isEmergency = announcement.category === "emergency";
  const isImportant = announcement.is_important || announcement.category === "important";
  const notificationType = isEmergency
    ? "announcement_emergency"
    : isImportant
      ? "announcement_important"
      : "announcement";

  const shortDescription = getShortDescription(announcement.message);
  const titlePrefix = isEmergency ? "Emergency announcement" : "New announcement";
  const title = reason === "marked_important"
    ? `Important announcement: ${announcement.title}`
    : `${titlePrefix}: ${announcement.title}`;

  const data = {
    category: "announcement",
    announcementCategory: announcement.category,
    announcementId: announcement._id.toString(),
    deepLink: `announcement?id=${announcement._id.toString()}`,
  };

  const notification = await createAndSendNotification({
    io,
    userIds: recipients.map((recipient) => recipient._id),
    societyId: announcement.society_id,
    type: notificationType,
    title,
    message: shortDescription,
    data,
  });

  if (io) {
    io.to(`society_${announcement.society_id}`).emit("announcement:published", {
      announcement,
      reason,
    });
  }

  return notification;
};
