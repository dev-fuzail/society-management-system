import ChatMessage from "../models/ChatMessage.js";
import ChatRoom from "../models/ChatRoom.js";

// Get all messages for roomId
export const getMessages = async (req, res) => {
  try {
    const messages = await ChatMessage.find({ roomId: req.params.roomId })
      .populate("senderId", "name email")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      message: "Messages fetched successfully.",
      result: messages,
    });
  } catch (err) {
    console.error("Error fetching messages:", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to get messages" });
  }
};

// Send message
export const sendMessage = async (req, res) => {
  try {
    const newMsg = await ChatMessage.create({
      roomId: req.body.roomId,
      senderId: req.body.senderId,
      text: req.body.text || null,
      attachment: req.body.attachment || null,
    });

    // Emit to socket room
    req.io.to(`room_${req.body.roomId}`).emit("newMessage", newMsg);

    return res.status(201).json({
      success: true,
      message: "Message sent successfully.",
      result: newMsg,
    });
  } catch (err) {
    console.error("Error sending message:", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to send message" });
  }
};

// Edit message
export const editMessage = async (req, res) => {
  try {
    const updated = await ChatMessage.findByIdAndUpdate(
      req.params.id,
      { text: req.body.text },
      { new: true }
    );

    return res.status(200).json({
      success: true,
      message: "Message updated successfully.",
      result: updated,
    });
  } catch (err) {
    console.error("Error editing message:", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to edit message" });
  }
};

// Delete message
export const deleteMessage = async (req, res) => {
  try {
    await ChatMessage.findByIdAndDelete(req.params.id);

    return res
      .status(200)
      .json({ success: true, message: "Message deleted successfully." });
  } catch (err) {
    console.error("Error deleting message:", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to delete message" });
  }
};

// Create Room
export const createRoom = async (req, res) => {
  try {
    const { name, societyId, created_by } = req.body;

    const existingRoom = await ChatRoom.findOne({ societyId });
    if (existingRoom) {
      return res.status(200).json({
        success: true,
        message: "Room already exists.",
        room: existingRoom,
      });
    }

    const newRoom = new ChatRoom({ name, societyId, created_by });
    await newRoom.save();
    return res.status(201).json({
      success: true,
      message: "Room created successfully.",
      room: newRoom,
    });
  } catch (error) {
    console.error("Error creating room:", error);
    return res.status(400).json({ success: false, message: error.message });
  }
};

// Start Typing
export const startTyping = (req, res) => {
  const { roomId, userId, userName } = req.body;

  // Emit event to all clients in the room
  req.io
    .to(`room_${roomId}`)
    .emit("userTyping", { userId, userName, isTyping: true });

  return res.status(200).json({ success: true });
};

// Stop Typing
export const stopTyping = (req, res) => {
  const { roomId, userId, userName } = req.body;

  // Emit event to all clients in the room
  req.io
    .to(`room_${roomId}`)
    .emit("userTyping", { userId, userName, isTyping: false });

  return res.status(200).json({ success: true });
};