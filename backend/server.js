import dotenv from "dotenv";
dotenv.config(); // Move this to the top

import cors from "cors";
import express from "express";
import connectDB from "./config/db.js";
// import authRoutes from './routes/authRoutes.js';
import router from "./routes/index.js";

const app = express();

app.use(
  cors({
    origin: "*", // open for all during development
    methods: ["GET", "POST", "PUT", "DELETE"],
  })
);

// Middlewares
app.use(express.json());

// Routes
// app.use('/api/auth', authRoutes);

const PORT = process.env.PORT || 8001;

app.get("/", (req, res) => {
  res.send("✅ Backend reachable");
});

const startServer = async () => {
  try {
    await connectDB(); // Wait for Mongo connection first

    // Only then mount routes
    app.use("/api", router); // This is correct as your frontend API URL includes /api

    // Finally start the server
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`✅ Server running on http://0.0.0.0:${PORT}`);
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error.message);
    process.exit(1);
  }
};

startServer();
