import { test, describe } from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcrypt";
import { createRateLimiter } from "../middleware/rateLimiter.js";
import { isOriginAllowed, corsOptions } from "../config/corsConfig.js";

describe("Security & Defense Hardening", () => {
  test("bcrypt correctly hashes and verifies passwords", async () => {
    const rawPassword = "SuperSecretPassword123!";
    const hash = await bcrypt.hash(rawPassword, 10);

    assert.ok(hash.startsWith("$2b$") || hash.startsWith("$2a$"));
    assert.notStrictEqual(hash, rawPassword);

    const match = await bcrypt.compare(rawPassword, hash);
    assert.strictEqual(match, true);

    const wrongMatch = await bcrypt.compare("WrongPassword", hash);
    assert.strictEqual(wrongMatch, false);
  });

  test("input validation regex enforces valid room IDs and usernames", () => {
    const usernameRegex = /^[A-Za-z0-9_-]{2,20}$/;
    const roomIdRegex = /^[A-Za-z0-9_-]{2,30}$/;

    // Valid inputs
    assert.ok(usernameRegex.test("player_1"));
    assert.ok(usernameRegex.test("CoolGamer-99"));
    assert.ok(roomIdRegex.test("ROOM-123"));
    assert.ok(roomIdRegex.test("lobby_alpha_4"));

    // Invalid usernames: special chars, HTML tags, control chars, too short/long
    assert.strictEqual(usernameRegex.test("a"), false); // too short
    assert.strictEqual(usernameRegex.test("a".repeat(25)), false); // too long
    assert.strictEqual(usernameRegex.test("<script>"), false);
    assert.strictEqual(usernameRegex.test("user name with spaces"), false);
    assert.strictEqual(usernameRegex.test("user@name!"), false);

    // Invalid room IDs
    assert.strictEqual(roomIdRegex.test("x"), false);
    assert.strictEqual(roomIdRegex.test("room.name.with.dots"), false);
    assert.strictEqual(roomIdRegex.test("room;drop table;"), false);
  });

  test("rate limiter blocks requests when threshold is exceeded", () => {
    const limiter = createRateLimiter({
      windowMs: 1000,
      maxRequests: 3,
      message: "Rate limit exceeded",
    });

    const mockReq = { headers: {}, socket: { remoteAddress: "127.0.0.1" } };

    let statusCode = 200;
    let responseBody = null;
    let nextCalledCount = 0;

    const mockRes = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(body) {
        responseBody = body;
        return this;
      },
    };

    const next = () => {
      nextCalledCount++;
    };

    // Requests 1, 2, 3 should pass
    limiter(mockReq, mockRes, next);
    limiter(mockReq, mockRes, next);
    limiter(mockReq, mockRes, next);

    assert.strictEqual(nextCalledCount, 3);
    assert.strictEqual(statusCode, 200);

    // Request 4 should be rejected with 429
    limiter(mockReq, mockRes, next);
    assert.strictEqual(nextCalledCount, 3);
    assert.strictEqual(statusCode, 429);
    assert.strictEqual(responseBody?.message, "Rate limit exceeded");
  });

  test("CORS origin validator allows Vercel previews, production, localhost, and non-browser clients", () => {
    // 1. Missing origin (curl, cron jobs, server-to-server)
    assert.strictEqual(isOriginAllowed(undefined), true);
    assert.strictEqual(isOriginAllowed(null), true);
    assert.strictEqual(isOriginAllowed(""), true);

    // 2. Production Vercel domain
    assert.strictEqual(isOriginAllowed("https://sketch-battle-rho.vercel.app"), true);

    // 3. Dynamic Vercel branch and preview deployments
    assert.strictEqual(
      isOriginAllowed("https://sketch-battle-a700e3bez-kush-guptas-projects-68beb030.vercel.app"),
      true
    );
    assert.strictEqual(isOriginAllowed("https://sketch-battle-preview.vercel.app"), true);

    // 4. Local development URLs
    assert.strictEqual(isOriginAllowed("http://localhost:5173"), true);
    assert.strictEqual(isOriginAllowed("http://localhost:3000"), true);
    assert.strictEqual(isOriginAllowed("http://127.0.0.1:8080"), true);

    // 5. Custom allowed origins or comma-separated env values
    assert.strictEqual(
      isOriginAllowed("https://mycustomdomain.com", ["https://mycustomdomain.com, https://other.com"]),
      true
    );
    assert.strictEqual(
      isOriginAllowed("https://other.com", ["https://mycustomdomain.com, https://other.com"]),
      true
    );

    // 6. Block untrusted malicious origins
    assert.strictEqual(isOriginAllowed("https://malicious-website.com"), false);
    assert.strictEqual(isOriginAllowed("https://attacker-sketch-battle.com"), false);

    // 7. Verify corsOptions origin callback contract
    let allowedResult = null;
    corsOptions.origin("https://sketch-battle-a700e3bez-kush-guptas-projects-68beb030.vercel.app", (err, allow) => {
      allowedResult = allow;
    });
    assert.strictEqual(allowedResult, true);

    let blockedResult = null;
    corsOptions.origin("https://evil.com", (err, allow) => {
      blockedResult = allow;
    });
    assert.strictEqual(blockedResult, false);
  });
});
