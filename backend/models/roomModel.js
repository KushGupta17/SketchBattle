import mongoose from "mongoose";

const participantSchema = new mongoose.Schema({
  username: { type: String, required: true },
  score: { type: Number, default: 0 },
  admin: { type: Boolean, default: false },
});

// Define the Room schema
const roomSchema = new mongoose.Schema(
  {
    roomId: { type: String, required: true, unique: true, index: true },
    password: { type: String, default: "" },
    participants: [participantSchema],
    settings: {
      rounds: { type: Number, default: 3 },
      drawTime: { type: Number, default: 80 },
      difficulty: { type: String, default: "medium" },
      customWords: { type: [String], default: [] },
    },
  },
  { timestamps: true }
);

// Auto-expire abandoned rooms after 24 hours (86400 seconds)
roomSchema.index({ createdAt: 1 }, { expireAfterSeconds: 86400 });

// Create and export the Room model
const Room = mongoose.model("Room", roomSchema);
export default Room;
