import express from "express";
import { createRoom, joinRoom } from "../controllers/roomController.js";
import { createRoomLimiter, joinRoomLimiter } from "../middleware/rateLimiter.js";

const router = express.Router();

// Route to create a room
router.post("/create", createRoomLimiter, createRoom);
router.post("/join", joinRoomLimiter, joinRoom);

export default router;
