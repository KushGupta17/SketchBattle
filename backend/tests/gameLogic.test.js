import { test, describe } from "node:test";
import assert from "node:assert/strict";
import GameLogic from "../services/gameLogic.js";
import {
  calculatePoints,
  generateWordHint,
  generateSimpleWordHint,
  isCloseGuess,
  getRandomWords,
} from "../utils/gameUtils.js";
import gameStateManager from "../services/gameStateManager.js";

describe("Game Logic & Scoring Rules", () => {
  test("calculatePoints assigns correct tiered points based on guess rank", () => {
    const totalPlayers = 5;

    // Guess rank 1 (1st guesser) -> 120 points
    assert.strictEqual(calculatePoints(1, totalPlayers), 120);

    // Guess rank 2 (2nd guesser) -> 110 points
    assert.strictEqual(calculatePoints(2, totalPlayers), 110);

    // Guess rank 3 (3rd guesser) -> 100 points
    assert.strictEqual(calculatePoints(3, totalPlayers), 100);

    // Guess rank 4 (4th guesser) -> 80 points
    assert.strictEqual(calculatePoints(4, totalPlayers), 80);

    // Only 2 players total -> 1st guesser gets first prize
    assert.strictEqual(calculatePoints(1, 2), 120);
  });

  test("generateSimpleWordHint creates appropriate blank underscores", () => {
    const hintSingle = generateSimpleWordHint("apple");
    assert.strictEqual(hintSingle, "_____");

    const hintSpaced = generateSimpleWordHint("ice cream");
    assert.strictEqual(hintSpaced, "___ _____");
  });

  test("generateWordHint reveals progressive letters over time", () => {
    const word = "elephant";
    const initial = generateWordHint(word, 0, 80000, new Set());
    // At start (0% elapsed), all letters are masked
    assert.strictEqual(initial.hint, "________");

    // With 50% time elapsed
    const mid = generateWordHint(word, 40000, 80000, new Set());
    assert.ok(mid.hint.includes("e"));
    assert.ok(mid.revealedPositions.size >= 1);
  });

  test("isCloseGuess detects close typos and avoids exact matches", () => {
    const secretWord = "elephant";

    // 1 letter typo -> close
    assert.strictEqual(isCloseGuess("elephan", secretWord), true);
    assert.strictEqual(isCloseGuess("elephnt", secretWord), true);
    assert.strictEqual(isCloseGuess("elephaant", secretWord), true);

    // Exact match -> false (should be processed as correct guess, not close alert)
    assert.strictEqual(isCloseGuess("elephant", secretWord), false);
    assert.strictEqual(isCloseGuess("ELEPHANT", secretWord), false);
    assert.strictEqual(isCloseGuess(" elephant ", secretWord), false);

    // Completely different word -> false
    assert.strictEqual(isCloseGuess("banana", secretWord), false);
    assert.strictEqual(isCloseGuess("car", secretWord), false);
  });

  test("getRandomWords returns requested count and respects difficulty tiers", () => {
    const easy = getRandomWords("easy", 3);
    assert.strictEqual(easy.length, 3);

    const medium = getRandomWords("medium", 3);
    assert.strictEqual(medium.length, 3);

    const hard = getRandomWords("hard", 3);
    assert.strictEqual(hard.length, 3);

    const mixed = getRandomWords("mixed", 3);
    assert.strictEqual(mixed.length, 3);
  });

  test("getRandomWords includes custom words when provided", () => {
    const customList = ["react", "typescript", "nodejs", "socketio"];
    const words = getRandomWords("medium", 3, customList);
    assert.strictEqual(words.length, 3);
  });

  test("GameLogic extracts configured rounds and turn duration from room settings", () => {
    const gl = new GameLogic();
    const testRoomId = "CONFIG_TEST_ROOM";

    gameStateManager.createGameRoom(testRoomId, {
      rounds: 5,
      drawTime: 60,
      difficulty: "hard",
    });

    const room = gameStateManager.getGameRoom(testRoomId);
    assert.strictEqual(gl.getTotalRounds(room), 5);
    assert.strictEqual(gl.getTurnTime(room), 60);

    // Default fallback when room settings are omitted
    assert.strictEqual(gl.getTotalRounds(null), 3);
    assert.strictEqual(gl.getTurnTime(null), 80);

    gameStateManager.deleteGameRoom(testRoomId);
  });
});
