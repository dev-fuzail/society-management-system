import dotenv from "dotenv";
dotenv.config();

import cors from "cors";
import express from "express";
import connectDB from "./config/db.js";
import router from "./routes/index.js";
import { createServer } from "http";
import { Server } from "socket.io";
import session from "express-session";
import adminRouter from "./adminRoutes.js";

const APP_SCHEME = "livingsync://";
const PORT = process.env.PORT || 8001;

const app = express();
const httpServer = createServer(app);

app.set("view engine", "ejs");
app.set("views", "./views");

const isAdminAuthenticated = (req, res, next) => {
  // Check if the session variable is set
  if (req.session && req.session.isAdmin) {
    return next();
  } // If not logged in, redirect to the login page
  return res.redirect("/admin-login");
};

// 1. SESSION MIDDLEWARE (Must run before routes that use session)
app.use(
  session({
    secret: process.env.SESSION_SECRET || "a_strong_fallback_secret_key",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      maxAge: 1000 * 60 * 60 * 24,
    },
  })
);

// 2. BODY PARSERS (Must run before routes that access req.body)
app.use(express.json()); // To parse application/json (for API calls)
app.use(express.urlencoded({ extended: true })); // To parse application/x-www-form-urlencoded (for HTML forms)

// 3. CORS
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);
app.options("*", cors()); // Handle preflight OPTIONS

// 4. Socket.IO Attachment Middleware
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

app.use((req, res, next) => {
  req.io = io; // Attach io instance
  console.log(req.method, req.path);
  next();
});

const webRouter = express.Router();

webRouter.get("/join", async (req, res) => {
  const { token } = req.query;
  if (!token) {
    return res
      .status(400)
      .send("<h1>Error</h1><p>Invitation token is missing.</p>");
  }
  try {
    // ⚠️ Add Token Validation Logic Here ⚠️
    const deepLinkUrl = `${APP_SCHEME}join?token=${token}`;
    console.log(`[DEEPLINK]: Redirecting to mobile app: ${deepLinkUrl}`);
    return res.redirect(302, deepLinkUrl);
  } catch (error) {
    const htmlError = `<h1>Link Expired or Invalid</h1><p>Please request a new invitation link.</p>`;
    return res.status(400).send(htmlError);
  }
});

webRouter.get("/reset-password", async (req, res) => {
  const { token, email } = req.query;
  if (!token || !email) {
    return res
      .status(400)
      .send("<h1>Error</h1><p>Reset link is incomplete.</p>");
  }
  try {
    // ⚠️ Add Token Validation Logic Here ⚠️
    const deepLinkUrl = `${APP_SCHEME}reset?token=${token}&email=${email}`;
    console.log(`[DEEPLINK]: Redirecting to mobile app: ${deepLinkUrl}`);
    return res.redirect(302, deepLinkUrl);
  } catch (error) {
    const htmlError = `<h1>Reset Failed</h1><p>This password reset link is invalid or has expired.</p>`;
    return res.status(400).send(htmlError);
  }
});

// Mount the webRouter on the root path
app.use("/", webRouter);
app.use("/", adminRouter);

// Mount the API router
app.use("/api", router);

// Default server health check
app.get("/", (req, res) => {
  res.send("✅ Backend reachable");
});

// ----------------------------------------------------------------------
// ---------------------------- SERVER START ----------------------------
// ----------------------------------------------------------------------

io.on("connection", (socket) => {
  console.log(`[SOCKET]: User connected: ${socket.id}`);

  socket.on("joinRoom", (roomId) => {
    socket.join(`room_${roomId}`);
    console.log(`[SOCKET]: ${socket.id} joined room: room_${roomId}`);
  });

  socket.on("disconnect", () => {
    console.log(`[SOCKET]: User disconnected: ${socket.id}`);
  });
});

const startServer = async () => {
  try {
    await connectDB();

    httpServer.listen(PORT, "0.0.0.0", () => {
      console.log(`✅ Socket.IO running on port ${PORT}`);
      console.log(`✅ Server running on http://0.0.0.0:${PORT}`);
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error.message);
    process.exit(1);
  }
};

startServer();
