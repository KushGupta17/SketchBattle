# SketchBattle — Product Requirements Document

## Product overview

SketchBattle is a real-time multiplayer drawing and guessing game, inspired by Skribbl.io. Players join a shared room, take turns drawing a randomly assigned word while the rest of the room guesses it through live chat, and earn points based on how quickly and accurately they guess, or how well their drawing gets understood.

The game runs on rooms with configurable rounds, in-browser voice and video through WebRTC, and scoring that persists across a full session. It's built with a real backend (Node and Express), a real-time transport layer (Socket.IO), a persistent data layer (MongoDB), and token-based authentication (JWT). The frontend deploys on Vercel, the backend on Render.

## Problem statement

Casual multiplayer games are a proven format for social interaction online. Many open-source implementations of this genre stop at the happy path: they handle a clean demo well and fall apart under real conditions. Players disconnect mid-round. Several people leave at once. Socket events arrive out of order or malformed. Concurrent rooms create race conditions that a single-player test never surfaces.

SketchBattle targets the harder version of this problem. Reconnection, room cleanup, scoring integrity, and concurrent state changes all need to work correctly, using patterns like atomic database updates, explicit state ownership, and room-membership verification. These are the parts of a real-time system that separate a working prototype from something built the way it would actually ship.

## Goals

Deliver a fully playable multiplayer drawing game, from first join to game end, with rounds, scoring, and hints.

Handle real-world connectivity problems without corrupting game state or scores: reconnections, disconnections, and players leaving mid-round.

Keep authentication and room access properly scoped, so a user can only act within rooms they've actually joined.

Separate the real-time layer into distinct concerns, state management, game logic, and transport, so the codebase stays debuggable as it grows.

Make the project defensible as a portfolio piece. Every claim in the README or resume should be true of the code that's actually running.

Security and state integrity: Room passwords are cryptographically hashed using bcrypt (with legacy plaintext migration), a max-player cap (8 players) is strictly enforced, and WebRTC signaling is validated to stay strictly within room boundaries. Room persistence in MongoDB is automatically managed with a 24-hour TTL index.

## Target users

Casual players want a lightweight, browser-based game to play with friends. No installs, quick room creation, low friction to join.

Small friend groups or remote teams want an icebreaker or a downtime activity with voice and video built in.

Technical reviewers, recruiters, interviewers, other engineers looking at the codebase, care less about gameplay polish and more about whether the real-time architecture and edge-case handling reflect sound engineering judgment.

## Core features

Room creation and joining. Users create or join a room through a shared code, and membership is tracked server-side.

Turn-based drawing. One player draws per round. Strokes broadcast to the rest of the room in real time over Socket.IO.

Live guessing. Non-drawing players submit guesses through chat. Correct guesses are detected server-side and pulled from the visible chat so the answer doesn't leak to other players.

Dynamic scoring. Points depend on how fast a player guessed relative to the rest of the room, with a separate calculation for the drawer's reward or penalty.

Progressive word hints. Letters of the target word reveal at fixed positions as the round timer counts down.

Timed rounds. A server-authoritative timer drives each round. Drawer rotation and word selection happen automatically at round end.

Authentication. JWT enforcement is consistent across REST endpoints and Socket.IO connections alike.

Reconnection handling. A player who disconnects and rejoins within the grace period keeps their score and room state instead of being treated as new.

Room lifecycle management. Rooms clean themselves up once the last participant leaves, so no orphaned state sits in memory.

Voice and video. Peer-to-peer audio and video signaling layers on top of the game session through WebRTC.

Gameplay polish and creative tools. Canvas paint bucket (high-performance 4-way BFS flood fill algorithm), stroke undo stack with keyboard shortcut (`Ctrl+Z`), zero-dependency Web Audio API synthesizer for sound effects (correct guess chime, turn start fanfare, close guess ping, warning tick, penalty buzzer, game victory fanfare) with global audio mute persistence, and an expanded 12-color palette.

Customizable room game rules. Room creators can customize total rounds (2-8), draw turn timer (45s, 60s, 80s, 100s), word difficulty tiers (easy, medium, hard, mixed), and optionally inject custom word lists.

Modular architecture & test defense. The monolithic play page is decomposed into dedicated custom hooks (`useCanvasDrawing` for canvas math, flood fill, scaling, and stroke undo; `useGameSocket` for real-time socket events, turn state machine, scoring, and cues). The backend is protected by sliding-window IP rate limiting (`rateLimiter.js`), strict regex input sanitization, and an automated test suite verifying scoring, hint revelations, Levenshtein distance close guesses, stroke undo, and reconnection score retention.

## Known limitations and roadmap

Recent improvements completed Phase 1 (room password bcrypt hashing, 8-player cap enforcement, mid-turn canvas restoration, spoiler chat isolation, WebRTC room scope checks, 24-hr TTL index), Phase 2 (canvas flood fill paint bucket, stroke undo stack, Web Audio SFX synthesizer, custom room settings & difficulty tiers, 12-color palette), and Phase 3 (monolithic page component decomposition into custom hooks, automated backend test suite, sliding window rate limiting, and regex input validation). Active backlog includes lobby chat pre-game and spectator mode for joining mid-match.