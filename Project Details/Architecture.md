# SketchBattle — Architecture

## High-level architecture

SketchBattle splits into two deployed units: a Vite-built React frontend on Vercel, and a Node and Express backend on Render, communicating over REST for one-off actions and Socket.IO for everything that happens during a live game.

REST handles the parts of the app that aren't time-sensitive: logging out, and room creation or lookup, through `roomController.js` and `logoutController.js`. Once a player is inside a room, the game itself runs entirely over Socket.IO. `socketHandlers.js` is the single entry point for every real-time event a client sends, and it delegates rather than doing the work itself.

Behind that entry point sit two services with a clear division of labor. `gameStateManager.js` owns the in-memory state of each room: who's in it, whose turn it is, current scores, round timers. `gameLogic.js` owns the rules: scoring calculations, hint reveal timing, turn rotation. Keeping these separate means a bug in scoring math can't silently corrupt room membership state, and vice versa. `socketAuth.js` sits in front of both as middleware, checking the JWT before game events get processed.

Persistence is minimal by design. `roomModel.js` and MongoDB (via `dbconnection.js`) store what needs to survive a server restart, room and user records. Everything that's purely runtime, active game state, current drawer, elapsed round time, lives in memory inside `gameStateManager.js` and gets discarded when a room empties out.

Voice and video don't touch the backend's game logic at all. `VideoCall.tsx` and `voiceInput.tsx` on the frontend establish WebRTC peer connections directly between clients. The backend's only role is relaying the signaling messages (offer, answer, ICE candidates) needed to establish those connections, over the same socket layer as everything else.

On the frontend, `pages/landing` and `pages/play` are the two real screens: pick or create a room, then play. The `play` screen is cleanly architected around two specialized custom hooks: `useCanvasDrawing.ts` (encapsulating canvas scaling, continuous stroke batching, flood fill, and undo stack) and `useGameSocket.ts` (encapsulating Socket.IO events, turn state machine, scoring, and audio cues). Inside play, `components/play` holds the active-game UI, canvas, chat, drawing tools, player list, and the three modals that interrupt gameplay at specific moments (word selection, round results, game end).

```mermaid
%%{init: {'theme': 'base', 'themeVariables': {'primaryColor': '#ffffff', 'primaryBorderColor': '#000000', 'primaryTextColor': '#000000', 'lineColor': '#000000', 'clusterBkg': '#ffffff', 'clusterBorder': '#000000', 'edgeLabelBackground':'#ffffff'}}}%%
flowchart TB
    subgraph Client["Frontend (React + Vite, Vercel)"]
        UI["pages/play\nuseCanvasDrawing, useGameSocket"]
        Components["components/play\ncanvas, chat, drawing tools, player list"]
        WebRTC_Client["VideoCall.tsx / voiceInput.tsx"]
        UI --> Components
    end

    subgraph Server["Backend (Node + Express, Render)"]
        RateLimiter["rateLimiter.js\nsliding window IP limiter"]
        REST["REST routes\nroomRoutes.js, logoutRoutes.js"]
        SocketAuth["socketAuth.js\nJWT check"]
        SocketHandlers["socketHandlers.js\nsingle entry point for game events"]
        GameStateManager["gameStateManager.js\nin-memory room/game state"]
        GameLogic["gameLogic.js\nscoring, hints, turn rules"]
        RateLimiter --> REST
    end

    DB[("MongoDB\nroomModel.js")]

    UI -->|"REST: create/join room, logout"| REST
    UI <-->|"Socket.IO events"| SocketAuth
    SocketAuth --> SocketHandlers
    SocketHandlers --> GameStateManager
    SocketHandlers --> GameLogic
    GameStateManager <--> GameLogic
    REST --> DB
    GameStateManager -.->|"persisted room/user data"| DB

    WebRTC_Client <-->|"signaling relayed over Socket.IO"| SocketHandlers
    WebRTC_Client <==>|"direct peer-to-peer audio/video"| WebRTC_Client
```

## Technology stack

Frontend: React 18 with TypeScript, built with Vite, styled with Tailwind CSS, deployed to Vercel. Includes custom hooks (`useCanvasDrawing`, `useGameSocket`), zero-dependency Web Audio API synthesizer for instant in-game sound effects (`soundEffects.ts`), and BFS canvas flood fill (`floodFill.ts`).

Backend: Node.js with Express, deployed to Render.

Real-time transport: Socket.IO, used for all in-game events, drawing synchronization (stroke batches & flood fill actions), stroke undo stack broadcasts, and WebRTC signaling.

Database: MongoDB, accessed through Mongoose, with 24-hour TTL index room expiration and customizable room game rules (rounds, turn duration, word difficulty, custom words).

Authentication & Security: JWT checked on both REST requests and Socket.IO events, bcrypt cryptographic password hashing for room protection, sliding window IP rate limiting (`rateLimiter.js`), and strict input regex sanitization.

Automated Testing: Native `node:test` and `node:assert` test suite covering game scoring, word hints, Levenshtein distance close guesses, stroke undo, and reconnection state persistence.

Peer-to-peer media: WebRTC, for in-room voice and video.

## Folder structure

```
SketchBattle/
├── backend/
│   ├── config/
│   │   └── gameConfig.js          # constants: scoring, timers
│   ├── controllers/
│   │   ├── logoutController.js
│   │   └── roomController.js
│   ├── db/
│   │   └── dbconnection.js        # MongoDB connection setup
│   ├── handlers/
│   │   └── socketHandlers.js      # single entry point for all socket events
│   ├── middleware/
│   │   ├── rateLimiter.js         # IP-based sliding window rate limiter
│   │   └── socketAuth.js          # JWT check before game events are processed
│   ├── models/
│   │   └── roomModel.js
│   ├── routes/
│   │   ├── logoutRoutes.js
│   │   └── roomRoutes.js
│   ├── services/
│   │   ├── gameLogic.js           # scoring, hints, turn rules
│   │   └── gameStateManager.js    # in-memory room and game state
│   ├── tests/
│   │   ├── gameLogic.test.js      # points, hints, Levenshtein tests
│   │   ├── gameStateManager.test.js # stroke undo and score state tests
│   │   └── security.test.js       # rate limiting and bcrypt tests
│   ├── utils/
│   │   └── gameUtils.js
│   ├── .env
│   ├── index.js                   # server entry point
│   ├── polyfill.js                # Node 26 Buffer compatibility
│   └── package.json
│
└── frontend/
    ├── public/
    ├── src/
    │   ├── assets/
    │   ├── components/
    │   │   └── play/
    │   │       ├── modals/
    │   │       │   ├── gameEndModal.tsx
    │   │       │   ├── roundResultModal.tsx
    │   │       │   └── wordSelectModal.tsx
    │   │       ├── chatSection.tsx
    │   │       ├── drawingtools.tsx
    │   │       ├── navbar.tsx
    │   │       ├── playerList.tsx
    │   │       ├── VideoCall.tsx
    │   │       └── voiceInput.tsx
    │   ├── hooks/
    │   │   ├── useCanvasDrawing.ts    # canvas scaling, strokes, flood fill, undo
    │   │   ├── useGameSocket.ts       # socket lifecycle, turns, modals, audio cues
    │   │   └── useVoiceFeedback.ts
    │   ├── pages/
    │   │   ├── landing/
    │   │   │   └── page.tsx
    │   │   └── play/
    │   │       └── page.tsx           # streamlined orchestration view
    │   ├── types/
    │   │   └── types.ts
    │   ├── utils/
    │   │   ├── backend_url.ts
    │   │   ├── floodFill.ts           # 4-way BFS canvas flood fill
    │   │   └── soundEffects.ts        # zero-dependency Web Audio synthesizer
    │   ├── App.tsx
    │   ├── index.css
    │   ├── main.tsx
    │   └── vite-env.d.ts
    ├── .env
    ├── eslint.config.js
    ├── index.html
    ├── package.json
    ├── tailwind.config.js
    ├── tsconfig.json
    ├── vercel.json
    ├── vite.config.ts
    └── README.md
```