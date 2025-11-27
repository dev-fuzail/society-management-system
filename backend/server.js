import dotenv from "dotenv";
dotenv.config();

import cors from "cors";
import express from "express";
import connectDB from "./config/db.js";
// import authRoutes from './routes/authRoutes.js';
import router from "./routes/index.js";
import { createServer } from "http";
import { Server } from "socket.io";

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true,
  },
});
// app.use(
//   cors({
//     origin: "*", // open for all during development
//     methods: ["GET", "POST", "PUT", "DELETE"],
//   })
// );

const allowedOrigins = [
  "http://localhost:8081", // web dev
  "http://localhost:8082", // backend web port
  "http://192.168.0.110:8081", // your LAN IP for web
  "http://192.168.0.110:8082", // backend LAN access
  "exp://192.168.0.110:19000", // Expo Go mobile
  // --- FIX: Removed the trailing slash from this URL ---
  "https://qhc8m3c-anonymous-8081.exp.direct",
  "https://aeronautically-uncarpentered-dorthey.ngrok-free.dev",
  // "http://10.142.227.144:8081",
  "http://192.168.137.13:8081",
  "http://192.168.137.10:8081",
];

app.use(
  cors({
    // origin: (origin, callback) => {
    //   // --- DEBUGGING ---
    //   // Log the incoming origin to see what it is
    //   console.log(`CORS check: Origin = ${origin}`); // Allow requests with no origin (like mobile apps or curl) // --- END DEBUGGING ---
    //   if (!origin) return callback(null, true);
    //   if (allowedOrigins.includes(origin)) {
    //     console.log(`CORS check: ALLOWED origin = ${origin}`);
    //     return callback(null, true);
    //   } else {
    //     // Log the specific origin that was rejected
    //     console.error(`CORS check: REJECTED origin = ${origin}`);
    //     return callback(new Error("Not allowed by CORS"));
    //   }
    // },
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true, // if sending cookies or auth headers
  })
);

// Handle preflight OPTIONS
app.options("*", cors());

// Middlewares
app.use(express.json());

app.use((req, res, next) => {
  req.io = io;
  console.log(req.method, req.path);
  next();
});

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

const PORT = process.env.PORT || 8001;

app.get("/", (req, res) => {
  res.send("✅ Backend reachable");
});

app.use("/api", router);

const startServer = async () => {
  try {
    await connectDB(); // Wait for Mongo connection first // // Only then mount routes // app.use("/api", router); // This is correct as your frontend API URL includes /api // Finally start the server

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
