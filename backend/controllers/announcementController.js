import Announcement from "../models/Announcement.js";

// Helper for consistent response format
const sendResponse = (res, status, message, result, success = true) => {
  return res.status(status).json({
    status: success, // Boolean status as requested
    success: success, // Keeping success for compatibility
    message,
    result,
  });
};

// 🟢 Create Announcement
export const createAnnouncement = async (req, res) => {
  try {
    const { society_id, title, message, user_id } = req.body;

    if (!society_id || !title || !message || !user_id) {
      return sendResponse(
        res,
        400,
        "All fields (society_id, title, message, user_id) are required.",
        null,
        false,
      );
    }

    const newAnnouncement = new Announcement({
      society_id,
      user_id,
      title,
      message,
    });

    await newAnnouncement.save();

    return sendResponse(
      res,
      201,
      "Announcement created successfully.",
      newAnnouncement,
    );
  } catch (error) {
    console.error("Create Announcement Error:", error);
    return sendResponse(
      res,
      500,
      error.message || "Failed to create announcement.",
      null,
      false,
    );
  }
};

// 🔵 Get All Announcements for a Society
export const getAnnouncementsBySociety = async (req, res) => {
  try {
    const { societyId } = req.params;

    const announcements = await Announcement.find({ society_id: societyId })
      .populate("user_id", "name email avatar") // Populate creator details if needed
      .sort({ created_at: -1 }); // Newest first

    return sendResponse(
      res,
      200,
      "Announcements fetched successfully.",
      announcements,
    );
  } catch (error) {
    console.error("Get Announcements Error:", error);
    return sendResponse(
      res,
      500,
      "Failed to fetch announcements.",
      null,
      false,
    );
  }
};

// 🟡 Get Single Announcement
export const getAnnouncementById = async (req, res) => {
  try {
    const { id } = req.params;

    const announcement = await Announcement.findById(id).populate(
      "user_id",
      "name",
    );

    if (!announcement) {
      return sendResponse(res, 404, "Announcement not found.", null, false);
    }

    return sendResponse(
      res,
      200,
      "Announcement fetched successfully.",
      announcement,
    );
  } catch (error) {
    return sendResponse(res, 500, "Failed to fetch announcement.", null, false);
  }
};

// 🟠 Update Announcement
export const updateAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, message } = req.body;

    const updatedAnnouncement = await Announcement.findByIdAndUpdate(
      id,
      { title, message },
      { new: true }, // Return the updated document
    );

    if (!updatedAnnouncement) {
      return sendResponse(res, 404, "Announcement not found.", null, false);
    }

    return sendResponse(
      res,
      200,
      "Announcement updated successfully.",
      updatedAnnouncement,
    );
  } catch (error) {
    return sendResponse(
      res,
      500,
      "Failed to update announcement.",
      null,
      false,
    );
  }
};

// 🔴 Delete Announcement
export const deleteAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await Announcement.findByIdAndDelete(id);

    if (!deleted) {
      return sendResponse(res, 404, "Announcement not found.", null, false);
    }

    return sendResponse(res, 200, "Announcement deleted successfully.", null);
  } catch (error) {
    return sendResponse(
      res,
      500,
      "Failed to delete announcement.",
      null,
      false,
    );
  }
};
