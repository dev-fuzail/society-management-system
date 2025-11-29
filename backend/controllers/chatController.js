import ChatMessage from "../models/ChatMessage.js";
import ChatRoom from "../models/ChatRoom.js";

const log = (...msg) => console.log("📩 [CHAT-CONTROLLER]:", ...msg);

// Get all messages for roomId
export const getMessages = async (req, res) => {
  try {
    log("Incoming GET messages request:", req.params.roomId);

    const messages = await ChatMessage.find({ roomId: req.params.roomId })
      .populate("senderId", "name email")
      .sort({ createdAt: -1 });

    log("Messages fetched:", messages.length);
    return res
      .status(200)
      .json({
        success: true,
        message: "Messages fetched successfully.",
        result: messages,
      });
  } catch (err) {
    log("❌ Error fetching messages:", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to get messages" });
  }
};

// Send message
export const sendMessage = async (req, res) => {
  try {
    log("Incoming SEND message request:", req.body);

    const newMsg = await ChatMessage.create({
      roomId: req.body.roomId,
      senderId: req.body.senderId,
      text: req.body.text || null,
      attachment: req.body.attachment || null,
    });

    log("Message created:", newMsg);

    // Emit to socket room
    req.io.to(`room_${req.body.roomId}`).emit("newMessage", newMsg);

    return res
      .status(201)
      .json({
        success: true,
        message: "Message sent successfully.",
        result: newMsg,
      });
  } catch (err) {
    log("❌ Error sending message:", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to send message" });
  }
};

// Edit message
export const editMessage = async (req, res) => {
  try {
    log("Incoming EDIT message request:", req.params.id, req.body.text);

    const updated = await ChatMessage.findByIdAndUpdate(
      req.params.id,
      { text: req.body.text },
      { new: true }
    );

    log("Message updated:", updated);
    return res
      .status(200)
      .json({
        success: true,
        message: "Message updated successfully.",
        result: updated,
      });
  } catch (err) {
    log("❌ Error editing message:", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to edit message" });
  }
};

// Delete message
export const deleteMessage = async (req, res) => {
  try {
    log("Incoming DELETE message request:", req.params.id);

    await ChatMessage.findByIdAndDelete(req.params.id);

    log("Message deleted");
    return res
      .status(200)
      .json({ success: true, message: "Message deleted successfully." });
  } catch (err) {
    log("❌ Error deleting message:", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to delete message" });
  }
};

export const createRoom = async (req, res) => {
  console.log("🚪 Incoming CREATE ROOM request:", req.body);
  try {
    const { name, societyId, created_by } = req.body;

    const existingRoom = await ChatRoom.findOne({ societyId });
    if (existingRoom) {
      return res
        .status(200)
        .json({
          success: true,
          message: "Room already exists.",
          room: existingRoom,
        });
    }

    const newRoom = new ChatRoom({ name, societyId, created_by });
    await newRoom.save();
    return res
      .status(201)
      .json({
        success: true,
        message: "Room created successfully.",
        room: newRoom,
      });
  } catch (error) {
    console.warn(error);
    return res.status(400).json({ success: false, message: error.message });
  }
};

export const startTyping = (req, res) => {
  const { roomId, userId, userName } = req.body;
  log(`[SOCKET]: ${userName} started typing in room_${roomId}`);

  // Emit event to all clients in the room (excluding the sender, if possible, but emitting to all is simpler)
  req.io
    .to(`room_${roomId}`)
    .emit("userTyping", { userId, userName, isTyping: true });

  return res.status(200).json({ success: true });
};

// 🛠️ NEW: Socket handler for when a user stops typing
export const stopTyping = (req, res) => {
  const { roomId, userId, userName } = req.body;
  log(`[SOCKET]: ${userName} stopped typing in room_${roomId}`);

  // Emit event to all clients in the room (excluding the sender)
  req.io
    .to(`room_${roomId}`)
    .emit("userTyping", { userId, userName, isTyping: false });

  return res.status(200).json({ success: true });
};
