import { test, describe } from "node:test";
import assert from "node:assert/strict";
import gameStateManager from "../services/gameStateManager.js";

describe("GameStateManager & Stroke Undo", () => {
  const roomId = "TEST_GSM_ROOM";

  test("initializes game room with custom settings", () => {
    const room = gameStateManager.createGameRoom(roomId, {
      rounds: 4,
      drawTime: 45,
      difficulty: "easy",
      customWords: ["robot", "laser"],
    });

    assert.ok(room);
    assert.strictEqual(room.settings.rounds, 4);
    assert.strictEqual(room.settings.drawTime, 45);
    assert.strictEqual(room.settings.difficulty, "easy");
    assert.deepStrictEqual(room.settings.customWords, ["robot", "laser"]);
  });

  test("undoLastStroke pops all coordinate points belonging to the same strokeId", () => {
    // Add stroke 1 (3 points)
    gameStateManager.addDrawHistory(roomId, { x: 10, y: 10, strokeId: "stroke_alpha" });
    gameStateManager.addDrawHistory(roomId, { x: 20, y: 20, strokeId: "stroke_alpha" });
    gameStateManager.addDrawHistory(roomId, { x: 30, y: 30, strokeId: "stroke_alpha" });

    // Add stroke 2 (2 points)
    gameStateManager.addDrawHistory(roomId, { x: 100, y: 100, strokeId: "stroke_beta" });
    gameStateManager.addDrawHistory(roomId, { x: 110, y: 110, strokeId: "stroke_beta" });

    assert.strictEqual(gameStateManager.getDrawHistory(roomId).length, 5);

    // Undo stroke 2 -> removes both points of stroke_beta
    const historyAfterFirstUndo = gameStateManager.undoLastStroke(roomId);
    assert.strictEqual(historyAfterFirstUndo.length, 3);
    assert.strictEqual(historyAfterFirstUndo[historyAfterFirstUndo.length - 1].strokeId, "stroke_alpha");

    // Undo stroke 1 -> removes all 3 points of stroke_alpha
    const historyAfterSecondUndo = gameStateManager.undoLastStroke(roomId);
    assert.strictEqual(historyAfterSecondUndo.length, 0);

    // Undoing empty history returns empty array safely
    const emptyResult = gameStateManager.undoLastStroke(roomId);
    assert.deepStrictEqual(emptyResult, []);
  });

  test("undoLastStroke handles single fill action with unique strokeId", () => {
    gameStateManager.addDrawHistory(roomId, {
      x: 50,
      y: 50,
      type: "fill",
      strokeId: "fill_12345",
      color: "#ff0000",
    });

    assert.strictEqual(gameStateManager.getDrawHistory(roomId).length, 1);

    const history = gameStateManager.undoLastStroke(roomId);
    assert.strictEqual(history.length, 0);
  });

  test("preserves score across player disconnection and reconnection using userId", () => {
    const socketId1 = "sock_1";
    const userId1 = "TEST_GSM_ROOM_Alice";
    const username1 = "Alice";

    // Player joins
    const player1 = gameStateManager.addOrUpdatePlayer(roomId, socketId1, {
      username: username1,
      userId: userId1,
    });
    assert.ok(player1);

    // Update score
    const room = gameStateManager.getGameRoom(roomId);
    room.scores.set(userId1, 220);
    player1.score = 220;

    assert.strictEqual(gameStateManager.getPlayerByUserId(roomId, userId1)?.score, 220);

    // Player disconnects (keeps state in playerStates & scores)
    gameStateManager.disconnectPlayer(roomId, socketId1);

    // Verify score is still tracked by userId
    assert.strictEqual(room.scores.get(userId1), 220);

    // Player reconnects on new socketId
    const socketId2 = "sock_2_reconnected";
    const reconnectedPlayer = gameStateManager.addOrUpdatePlayer(roomId, socketId2, {
      username: username1,
      userId: userId1,
    });

    assert.strictEqual(reconnectedPlayer.score, 220, "Reconnected player must keep their accumulated score");

    // Cleanup
    gameStateManager.deleteGameRoom(roomId);
  });
});
