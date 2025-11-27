import ChatMessage from "../models/ChatMessage.js";
import ChatRoom from "../models/ChatRoom.js";
import mongoose from "mongoose";

// Debug Utility
const log = (...msg) => console.log("📩 [CHAT-CONTROLLER]:", ...msg);

// Get all messages for roomId
export const getMessages = async (req, res) => {
  try {
    log("Incoming GET messages request:", req.params.roomId);

    const messages = await ChatMessage.find({ roomId: req.params.roomId })
      .populate("senderId", "name email")
      .sort({ createdAt: -1 });

    log("Messages fetched:", messages.length);
    res.json(messages);
  } catch (err) {
    log("❌ Error fetching messages:", err);
    res.status(500).json({ error: "Failed to get messages" });
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

    res.json(newMsg);
  } catch (err) {
    log("❌ Error sending message:", err);
    res.status(500).json({ error: "Failed to send message" });
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
    res.json(updated);
  } catch (err) {
    log("❌ Error editing message:", err);
    res.status(500).json({ error: "Failed to edit message" });
  }
};

// Delete message
export const deleteMessage = async (req, res) => {
  try {
    log("Incoming DELETE message request:", req.params.id);

    await ChatMessage.findByIdAndDelete(req.params.id);

    log("Message deleted");
    res.json({ success: true });
  } catch (err) {
    log("❌ Error deleting message:", err);
    res.status(500).json({ error: "Failed to delete message" });
  }
};

export const createRoom = async (req, res) => {
  console.log("🚪 Incoming CREATE ROOM request:", req.body);
  try {
    const { roomId, created_by, welcomeText } = req.body;

    // Check if room already exists
    let room = await ChatRoom.findOne({ roomId });
    if (room) {
      return res.status(200).json({ status: true, message: "Room already exists", result: room });
    }

    // Create new room
    room = new ChatRoom({
      roomId,
      created_by,
      messages: [],
    });
    await room.save();

    // Add welcome message if provided
    if (welcomeText) {
      const msg = new Message({
        roomId: room._id,
        text: welcomeText,
        user_id: created_by,
      });
      await msg.save();

      room.messages.push(msg._id);
      await room.save();
    }

    return res.status(201).json({ status: true, message: "Room created", result: room });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: false, message: error.message });
  }
};
