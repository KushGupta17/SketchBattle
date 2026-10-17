import "./polyfill.js";
import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import cron from "node-cron";
import { connectDB } from "./db/dbconnection.js";
import roomRoutes from "./routes/roomRoutes.js";
import dotenv from "dotenv";
import logoutRoutes from "./routes/logoutRoutes.js";
import { socketAuthMiddleware } from "./middleware/socketAuth.js";
import setupSocketHandlers from "./handlers/socketHandlers.js";

import { corsOptions } from "./config/corsConfig.js";

dotenv.config();

// Validate required environment variables
const requiredEnvVars = ['MONGODB_URI', 'JWT_SECRET'];
requiredEnvVars.forEach(varName => {
  if (!process.env[varName]) {
    console.warn(`Warning: ${varName} is not set in .env`);
  }
});

const app = express();

app.use(cors(corsOptions));

app.use(express.json());

const server = http.createServer(app);
connectDB();

// Configure Socket.IO with CORS
const io = new Server(server, {
  cors: corsOptions,
});

// Socket.IO Authentication Middleware
io.use(socketAuthMiddleware);

// Setup Socket Handlers
setupSocketHandlers(io);

// ✅ Root & Health check routes
app.get("/", (req, res) => {
  res.status(200).json({
    status: "ok",
    service: "SketchBattle Backend API",
    message: "Server is running smoothly",
    timestamp: new Date().toISOString(),
  });
});

app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

// Routes
app.use("/api/rooms", roomRoutes);
app.use("/api/logout", logoutRoutes);

// Start the server
const PORT = process.env.PORT || 3000;
const PING_URL = process.env.SELF_URL || process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);

  const pingBackend = async () => {
    try {
      const response = await fetch(`${PING_URL}/health`);
      console.log(`Self-ping to ${PING_URL} status: ${response.status}`);
    } catch (error) {
      console.error(`Self-ping failed for ${PING_URL}:`, error.message || error);
    }
  };

  cron.schedule("0 */10 * * * *", async () => {
    await pingBackend();
  }, {
    scheduled: true,
    timezone: "UTC",
  });

  setTimeout(() => {
    pingBackend();
  }, 30 * 1000);
});