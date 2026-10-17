import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import Room from "../models/roomModel.js";
import { GAME_CONFIG } from "../config/gameConfig.js";

// Create a room
export const createRoom = async (req, res) => {
  try {
    const { roomId, username, password, settings } = req.body;

    if (!roomId || !username || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const cleanRoomId = roomId.trim();
    const cleanUsername = username.trim();

    if (cleanUsername.toLowerCase() === "system") {
      return res.status(400).json({ message: "Username 'system' is reserved" });
    }

    const usernameRegex = /^[A-Za-z0-9_-]{2,20}$/;
    if (!usernameRegex.test(cleanUsername)) {
      return res.status(400).json({
        message: "Username must be 2-20 characters long and contain only letters, numbers, underscores, or hyphens",
      });
    }

    const roomIdRegex = /^[A-Za-z0-9_-]{2,30}$/;
    if (!roomIdRegex.test(cleanRoomId)) {
      return res.status(400).json({
        message: "Room ID must be 2-30 characters long and contain only letters, numbers, underscores, or hyphens",
      });
    }

    if (typeof password !== "string" || password.length < 1 || password.length > 64) {
      return res.status(400).json({ message: "Password must be between 1 and 64 characters" });
    }

    const roomExists = await Room.findOne({ roomId: cleanRoomId });
    if (roomExists) {
      return res.status(400).json({ message: "Room already exists" });
    }

    // Sanitize optional custom settings
    const roomSettings = {
      rounds: Number(settings?.rounds) >= 2 && Number(settings?.rounds) <= 8 ? Number(settings.rounds) : 3,
      drawTime: [45, 60, 80, 100].includes(Number(settings?.drawTime)) ? Number(settings.drawTime) : 80,
      difficulty: ["easy", "medium", "hard", "mixed"].includes(settings?.difficulty) ? settings.difficulty : "medium",
      customWords: Array.isArray(settings?.customWords)
        ? settings.customWords.map(w => String(w).trim().toLowerCase()).filter(w => w.length >= 2 && w.length <= 30).slice(0, 50)
        : []
    };

    // Hash room password with bcrypt
    const hashedPassword = await bcrypt.hash(password, 10);

    const newRoom = new Room({
      roomId: cleanRoomId,
      password: hashedPassword,
      participants: [{ username: cleanUsername, score: 0, admin: true }],
      settings: roomSettings,
    });

    await newRoom.save();

    // Enhanced JWT token with userId
    const token = jwt.sign(
      {
        roomId: cleanRoomId,
        username: cleanUsername,
        userId: `${cleanRoomId}_${cleanUsername}`, // Unique identifier
        joinedAt: Date.now(),
      },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    const roomData = newRoom.toObject();
    delete roomData.password;

    res.status(201).json({
      message: "Room created successfully",
      room: roomData,
      token,
    });
  } catch (error) {
    console.error("Error creating room:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Join a room (with bcrypt verification, reconnection support & player cap)
export const joinRoom = async (req, res) => {
  try {
    const { roomId, username, password } = req.body;

    if (!roomId || !username || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const cleanRoomId = roomId.trim();
    const cleanUsername = username.trim();

    if (cleanUsername.toLowerCase() === "system") {
      return res.status(400).json({ message: "Username 'system' is reserved" });
    }

    const usernameRegex = /^[A-Za-z0-9_-]{2,20}$/;
    if (!usernameRegex.test(cleanUsername)) {
      return res.status(400).json({
        message: "Username must be 2-20 characters long and contain only letters, numbers, underscores, or hyphens",
      });
    }

    const roomIdRegex = /^[A-Za-z0-9_-]{2,30}$/;
    if (!roomIdRegex.test(cleanRoomId)) {
      return res.status(400).json({
        message: "Room ID must be 2-30 characters long and contain only letters, numbers, underscores, or hyphens",
      });
    }

    const room = await Room.findOne({ roomId: cleanRoomId });
    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    // Verify password (support both bcrypt hashes and legacy plaintext fallback)
    let isPasswordValid = false;
    if (room.password.startsWith("$2a$") || room.password.startsWith("$2b$")) {
      isPasswordValid = await bcrypt.compare(password, room.password);
    } else {
      isPasswordValid = room.password === password;
      if (isPasswordValid) {
        // Transparently upgrade legacy plaintext password to bcrypt hash
        room.password = await bcrypt.hash(password, 10);
        await room.save();
      }
    }

    if (!isPasswordValid) {
      return res.status(401).json({ message: "Incorrect password" });
    }

    // Check if user already exists in room (reconnection flow)
    const existingParticipant = room.participants.find(
      (p) => p.username.toLowerCase() === cleanUsername.toLowerCase()
    );

    if (!existingParticipant) {
      // Enforce MAX_PLAYERS limit for new players
      const maxPlayers = GAME_CONFIG.MAX_PLAYERS || 8;
      if (room.participants.length >= maxPlayers) {
        return res.status(400).json({ message: `Room is full (max ${maxPlayers} players)` });
      }

      room.participants.push({ username: cleanUsername, score: 0, admin: false });
      await room.save();
    }

    // Enhanced JWT token
    const token = jwt.sign(
      {
        roomId: cleanRoomId,
        username: cleanUsername,
        userId: `${cleanRoomId}_${cleanUsername}`,
        joinedAt: Date.now(),
      },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    const roomData = room.toObject();
    delete roomData.password;

    res.status(200).json({
      message: existingParticipant ? "Reconnected to room successfully" : "Joined room successfully",
      room: roomData,
      token,
    });
  } catch (error) {
    console.error("Error joining room:", error);
    res.status(500).json({ message: "Server error" });
  }
};
