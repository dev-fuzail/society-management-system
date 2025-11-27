import express from "express";
import multer from "multer";
import {
  getMessages,
  sendMessage,
  editMessage,
  deleteMessage,
  createRoom
} from "../controllers/chatController.js";

const router = express.Router();

// multer storage (local)
const upload = multer({ dest: "uploads/" });

// GET messages
router.get("/messages/:roomId", getMessages);

// SEND message
router.post("/messages", sendMessage);

// EDIT
router.put("/messages/:id", editMessage);

// DELETE
router.delete("/messages/:id", deleteMessage);
router.post("/create-room", createRoom);

// Upload file
router.post("/upload", upload.single("file"), (req, res) => {
  console.log("📁 File upload received:", req.file);
  res.json({ url: `/uploads/${req.file.filename}` });
});

export default router;
