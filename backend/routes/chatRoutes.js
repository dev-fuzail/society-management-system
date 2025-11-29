import express from "express";
import multer from "multer";
import {
  getMessages,
  sendMessage,
  editMessage,
  deleteMessage,
  createRoom,
  startTyping,
  stopTyping,
} from "../controllers/chatController.js";

const router = express.Router();

// multer storage (local)
const storage = multer.diskStorage({
  destination: "uploads/", // Files will be saved in the root 'uploads' folder
  filename: (req, file, cb) => {
    // Generate a unique name and keep the original file extension
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(
      null,
      file.fieldname +
        "-" +
        uniqueSuffix +
        "." +
        file.originalname.split(".").pop()
    );
  },
});

const upload = multer({ storage: storage });

// GET messages
router.get("/messages/:roomId", getMessages);

// SEND message
router.post("/messages", sendMessage);

// EDIT
router.put("/messages/:id", editMessage);

// DELETE
router.delete("/messages/:id", deleteMessage);
router.post("/create-room", createRoom);

router.post("/typing/start", startTyping);
router.post("/typing/stop", stopTyping);

// Upload file
router.post("/upload", upload.single("file"), (req, res) => {
  if (!req.file) {
    return res
      .status(400)
      .json({ success: false, message: "No file uploaded." });
  }

  const relativeUrl = `/uploads/${req.file.filename}`;

  console.log("📁 File upload successful. Path:", relativeUrl);
  res.json({ success: true, result: { url: relativeUrl } });
});

export default router;
