import { GAME_CONFIG } from '../config/gameConfig.js';
import { calculatePoints, checkWordMatch, isCloseGuess } from '../utils/gameUtils.js';
import gameStateManager from '../services/gameStateManager.js';
import GameLogic from '../services/gameLogic.js';
import Room from '../models/roomModel.js';

export default function setupSocketHandlers(io) {
  const gameLogic = new GameLogic(io);

  io.on("connection", (socket) => {
    const { decoded } = socket;
    console.log(`Socket connected: ${socket.id} for user: ${decoded.username}`);

    // Helper to ensure WebRTC signaling stays within the authorized room
    const isTargetInSameRoom = (targetSocketId) => {
      const room = gameStateManager.getGameRoom(decoded.roomId);
      return Boolean(room && room.players.has(targetSocketId));
    };

    // WebRTC Signaling Handlers (Scoped to room members only)
    socket.on("webrtc-offer", ({ to, offer }) => {
      if (isTargetInSameRoom(to)) {
        socket.to(to).emit("webrtc-offer", { from: socket.id, offer });
      }
    });

    socket.on("webrtc-answer", ({ to, answer }) => {
      if (isTargetInSameRoom(to)) {
        socket.to(to).emit("webrtc-answer", { from: socket.id, answer });
      }
    });

    socket.on("webrtc-ice-candidate", ({ to, candidate }) => {
      if (isTargetInSameRoom(to)) {
        socket.to(to).emit("webrtc-ice-candidate", { from: socket.id, candidate });
      }
    });
    
    // Join Room Handler
    socket.on("joinRoom", async (roomId, username) => {
      socket.join(roomId);
      console.log(`${decoded.username} joining room: ${roomId}`);
      
      let roomSettings = {};
      try {
        const roomDoc = await Room.findOne({ roomId: decoded.roomId }).select("settings");
        if (roomDoc && roomDoc.settings) {
          roomSettings = roomDoc.settings;
        }
      } catch (err) {
        console.error("Error retrieving room settings:", err);
      }

      // Initialize game room if it doesn't exist (with room settings)
      const gameRoom = gameStateManager.createGameRoom(roomId, roomSettings);
      
      // Add or update player (handles reconnection)
      const playerState = gameStateManager.addOrUpdatePlayer(roomId, socket.id, {
        userId: decoded.userId,
        username: decoded.username
      });
      
      if (!playerState) {
        socket.emit("error", { message: "Failed to join room" });
        return;
      }
      
      const history = gameStateManager.getDrawHistory(roomId);
      if (history && history.length > 0) {
        socket.emit("canvasHistory", history);
      }
      
      const totalRounds = gameRoom.settings?.rounds || GAME_CONFIG.TOTAL_ROUNDS;

      // Send current game state to the player
      socket.emit("gameState", {
        state: gameRoom.gameState,
        round: gameRoom.currentRound,
        totalRounds: totalRounds,
        turnInRound: gameRoom.currentTurnInRound,
        totalTurnsInRound: gameRoom.totalPlayers,
        players: gameStateManager.getAllPlayers(roomId),
        scores: Object.fromEntries(gameRoom.scores),
        currentDrawer: gameRoom.currentDrawer ? 
          gameStateManager.getPlayerByUserId(roomId, gameRoom.currentDrawer)?.username : null,
        timeLeft: gameRoom.roundEndTime ? Math.max(0, gameRoom.roundEndTime - Date.now()) : 0
      });
      
      // Send join message
      if (playerState.joinedAt === playerState.lastSeen) {
        io.to(roomId).emit("joinMessage", {
          message: `${username} has joined the room.`,
        });
      } else {
        io.to(roomId).emit("joinMessage", {
          message: `${username} has reconnected.`,
        });
      }
      
      // Check if game can start after player joins
      const canStart = gameLogic.canStartGame(roomId);
      
      // Update all players about the current player list
      io.to(roomId).emit("playerUpdate", {
        players: gameStateManager.getAllPlayers(roomId),
        playerCount: gameStateManager.getPlayerCount(roomId),
        canStart: canStart
      });
      
      // Start game immediately if conditions are met
      if (canStart) {
        console.log(`All players ready in room ${roomId}, starting game immediately!`);
        setTimeout(() => {
          gameLogic.startGame(roomId);
        }, 1000); // Small delay to ensure all clients are updated
      }
      
      // If game is in progress and this is the current drawer, restore drawing state
      if (gameRoom.gameState === 'playing' && 
          gameRoom.currentDrawer === decoded.userId) { // FIX: Compare with userId
        
        console.log(`Restoring drawer state for ${decoded.username}`);
        
        if (gameRoom.isWordSelectionPhase && gameRoom.wordChoices) {
          socket.emit('wordChoices', {
            words: gameRoom.wordChoices,
            timeLimit: 15,
            round: gameRoom.currentRound,
            turn: gameRoom.currentTurnInRound + 1
          });
        } else if (gameRoom.currentWord) {
          // Send the actual word to the drawer
          socket.emit('drawerWord', { word: gameRoom.currentWord });
          
          // Also send drawing phase event to properly restore UI state
          socket.emit('drawingPhase', {
            word: gameRoom.currentWord, // Send actual word to drawer
            wordLength: gameRoom.currentWord.length,
            timeLeft: gameRoom.roundEndTime ? Math.max(0, gameRoom.roundEndTime - Date.now()) : 0,
            round: gameRoom.currentRound,
            turn: gameRoom.currentTurnInRound + 1,
            drawer: decoded.username
          });
        }
      }
    });

    // Leave Room Handler
    socket.on("leaveRoom", (roomId, username) => {
      console.log(`${username} leaving room: ${roomId}`);
      socket.leave(roomId);
      
      const gameRoom = gameStateManager.getGameRoom(roomId);
      if (gameRoom) {
        // FIX: Use removePlayer instead of disconnectPlayer for intentional leave
        const removedPlayer = gameStateManager.removePlayer(roomId, socket.id);
        
        // If current drawer left during their turn, end turn immediately
        if (gameRoom.currentDrawer === removedPlayer?.userId) {
          console.log(`Current drawer ${username} left the game, ending turn immediately`);
          gameLogic.endTurn(roomId, 'drawerLeft');
        }
        
        // Check if game should end due to insufficient players
        const connectedPlayersCount = gameStateManager.getPlayerCount(roomId);
        console.log(`Players remaining after ${username} left: ${connectedPlayersCount}`);
        
        // FIX: End game if only 1 or fewer players remain
        if (connectedPlayersCount <= 1 && gameRoom.gameState === 'playing') {
          console.log(`Only ${connectedPlayersCount} player(s) remaining, ending game...`);
          
          // Clear any running timers
          if (gameRoom.turnTimer) {
            clearInterval(gameRoom.turnTimer);
            gameRoom.turnTimer = null;
          }
          if (gameRoom.preparationTimer) {
            clearInterval(gameRoom.preparationTimer);
            gameRoom.preparationTimer = null;
          }
          
          // End game with special reason
          setTimeout(() => {
            const currentGameRoom = gameStateManager.getGameRoom(roomId);
            if (currentGameRoom && currentGameRoom.gameState === 'playing') {
              gameLogic.endGameDueToInsufficientPlayers(roomId);
            }
          }, 1000);
        } else {
          // Update player list for remaining players
          io.to(roomId).emit("playerUpdate", {
            players: gameStateManager.getAllPlayers(roomId),
            playerCount: connectedPlayersCount,
            canStart: false // Reset canStart when someone leaves
          });
        }
        
        if (removedPlayer) {
          io.to(roomId).emit("leaveMessage", {
            message: `${removedPlayer.username} has left the room.`,
          });
        }
      }
    });

    // Player Ready Handler
    socket.on("playerReady", () => {
      const roomId = decoded.roomId;
      const gameRoom = gameStateManager.getGameRoom(roomId);
      if (!gameRoom) return;
      
      const success = gameStateManager.updatePlayerReady(roomId, decoded.userId);
      if (!success) return;
      
      const canStart = gameLogic.canStartGame(roomId);
      
      console.log(`Player ${decoded.username} ready status changed. Can start: ${canStart}`);
      
      io.to(roomId).emit("playerUpdate", {
        players: gameStateManager.getAllPlayers(roomId),
        playerCount: gameStateManager.getPlayerCount(roomId),
        canStart: canStart
      });
      
      // Start game immediately if all players are ready
      if (canStart) {
        console.log(`All players ready in room ${roomId}, starting game immediately!`);
        // Send immediate game starting notification
        io.to(roomId).emit("gameStarting", {
          message: "All players ready! Game starting now...",
          countdown: 3
        });
        
        // Start game after brief countdown
        setTimeout(() => {
          gameLogic.startGame(roomId);
        }, 3000);
      }
    });

    // Word Selection Handler
    socket.on("selectWord", (selectedWord) => {
      const roomId = decoded.roomId;
      const success = gameLogic.selectWord(roomId, socket.id, selectedWord);
      
      if (!success) {
        socket.emit("error", { message: "Invalid word selection" });
      }
    });

    // Drawing Handler
    socket.on("draw", (data) => {
      const gameRoom = gameStateManager.getGameRoom(data.roomId);
      if (!gameRoom || gameRoom.isWordSelectionPhase) return;
      
      const drawingPlayer = gameStateManager.getPlayerBySocketId(data.roomId, socket.id);
      if (!drawingPlayer || drawingPlayer.userId !== gameRoom.currentDrawer) {
        return; // Only current drawer can draw
      }
      
      gameStateManager.addDrawHistory(data.roomId, data);
      io.to(data.roomId).emit("draw", data);
    });

    // Chat Message Handler
    socket.on("chatMessage", (data) => {
      if (!data || typeof data.message !== "string") return;
      const trimmedMessage = data.message.trim();
      if (!trimmedMessage || trimmedMessage.length > 100) return;

      data.message = trimmedMessage;
      data.username = decoded.username;
      data.roomId = decoded.roomId;

      const gameRoom = gameStateManager.getGameRoom(data.roomId);
      
      // Check if it's during active drawing phase
      if (gameRoom && 
          gameRoom.gameState === 'playing' && 
          gameRoom.currentWord &&
          !gameRoom.isWordSelectionPhase) {
        
        const guessingPlayer = gameStateManager.getPlayerBySocketId(data.roomId, socket.id);
        const drawerUserId = gameRoom.currentDrawer;
        
        // Prevent drawer from leaking the secret word in chat
        if (guessingPlayer && guessingPlayer.userId === drawerUserId) {
          if (trimmedMessage.toLowerCase().includes(gameRoom.currentWord.toLowerCase())) {
            socket.emit("chatMessage", {
              username: "System",
              message: "Warning: You cannot reveal the secret word in chat!",
              roomId: data.roomId
            });
            return;
          }
        }

        // Prevent players who already guessed from spoiling for others
        if (guessingPlayer && gameRoom.guessedPlayers.has(guessingPlayer.userId)) {
          const recipientUserIds = new Set(gameRoom.guessedPlayers);
          recipientUserIds.add(gameRoom.currentDrawer);

          for (const [sId, pState] of gameRoom.players.entries()) {
            if (recipientUserIds.has(pState.userId)) {
              io.to(sId).emit("chatMessage", {
                ...data,
                isGuessedOnly: true
              });
            }
          }
          return; // Do not broadcast to players still guessing
        }

        // Non-drawer player who hasn't guessed yet
        if (guessingPlayer && guessingPlayer.userId !== drawerUserId) {
          if (checkWordMatch(trimmedMessage, gameRoom.currentWord)) {
            // Correct guess! Record userId to prevent double-scoring across reconnections
            gameRoom.guessedPlayers.add(guessingPlayer.userId);
            const guessOrder = gameRoom.guessedPlayers.size;
            const connectedPlayersCount = gameStateManager.getPlayerCount(data.roomId);
            const points = calculatePoints(guessOrder, connectedPlayersCount);
            
            console.log(`Correct guess by ${guessingPlayer.username}! Points: ${points}`);
            
            // Update score in the scores Map (using userId as key)
            const currentScore = gameRoom.scores.get(guessingPlayer.userId) || 0;
            const newScore = currentScore + points;
            gameRoom.scores.set(guessingPlayer.userId, newScore);
            
            const playerState = gameStateManager.getPlayerByUserId(data.roomId, guessingPlayer.userId);
            if (playerState) {
              playerState.score = newScore;
            }
            
            // Notify about correct guess
            io.to(data.roomId).emit("correctGuess", {
              username: guessingPlayer.username,
              points,
              guessOrder,
              totalGuessed: gameRoom.guessedPlayers.size
            });
            
            // Update scores
            io.to(data.roomId).emit("scoreUpdate", {
              scores: Object.fromEntries(gameRoom.scores)
            });
            
            // End turn if everyone guessed (except drawer)
            if (gameRoom.guessedPlayers.size >= connectedPlayersCount - 1) {
              console.log(`All players guessed! Ending turn.`);
              gameLogic.endTurn(data.roomId, 'allGuessed');
            }
            
            return; // Don't send guess as regular chat message
          } else if (isCloseGuess(trimmedMessage, gameRoom.currentWord)) {
            // Private alert to the guesser that they are very close!
            socket.emit("chatMessage", {
              username: "System",
              message: `"${trimmedMessage}" is very close!`,
              roomId: data.roomId
            });
          }
        }
      }
      
      // Send as regular chat message
      io.to(data.roomId).emit("chatMessage", data);
    });

    // Clear Canvas Handler
    socket.on("clearCanvas", () => {
      const roomId = decoded.roomId;
      const gameRoom = gameStateManager.getGameRoom(roomId);
      if (!gameRoom || gameRoom.isWordSelectionPhase) return;
      
      const clearingPlayer = gameStateManager.getPlayerBySocketId(roomId, socket.id);
      if (!clearingPlayer || clearingPlayer.userId !== gameRoom.currentDrawer) {
        return; // Only current drawer can clear
      }
      
      gameStateManager.clearDrawHistory(roomId);
      io.to(roomId).emit("canvasClear");
    });

    // Undo Draw Handler
    socket.on("undoDraw", () => {
      const roomId = decoded.roomId;
      const gameRoom = gameStateManager.getGameRoom(roomId);
      if (!gameRoom || gameRoom.isWordSelectionPhase) return;

      const player = gameStateManager.getPlayerBySocketId(roomId, socket.id);
      if (!player || player.userId !== gameRoom.currentDrawer) {
        return; // Only current drawer can undo
      }

      const updatedHistory = gameStateManager.undoLastStroke(roomId);
      io.to(roomId).emit("canvasHistory", updatedHistory);
    });

    // Disconnect handler
    socket.on("disconnect", () => {
      console.log(`User Disconnected: ${socket.id} (${decoded.username})`);
      
      const roomId = decoded.roomId;
      const gameRoom = gameStateManager.getGameRoom(roomId);
      if (gameRoom) {
        const disconnectedPlayer = gameStateManager.disconnectPlayer(roomId, socket.id);
        
        // If current drawer disconnected during their turn
        if (gameRoom.currentDrawer === decoded.userId) {
          console.log(`Current drawer ${decoded.username} disconnected, waiting for reconnection...`);
          setTimeout(() => {
            const currentGameRoom = gameStateManager.getGameRoom(roomId);
            if (currentGameRoom && currentGameRoom.currentDrawer === decoded.userId) {
              // Check if drawer is still disconnected
              const drawerState = gameStateManager.getPlayerByUserId(roomId, decoded.userId);
              if (drawerState && !drawerState.isConnected) {
                console.log(`Drawer ${decoded.username} didn't reconnect, ending turn`);
                if (currentGameRoom.turnTimer) {
                  clearInterval(currentGameRoom.turnTimer);
                  currentGameRoom.turnTimer = null;
                }
                if (currentGameRoom.preparationTimer) {
                  clearInterval(currentGameRoom.preparationTimer);
                  currentGameRoom.preparationTimer = null;
                }
                gameLogic.endTurn(roomId, 'drawerLeft');
              }
            }
          }, 10000);
        }
        
        // FIX: Check if game should end due to insufficient connected players after disconnect
        const connectedPlayersCount = gameStateManager.getPlayerCount(roomId);
        console.log(`Connected players after ${decoded.username} disconnected: ${connectedPlayersCount}`);
        
        if (connectedPlayersCount <= 1 && gameRoom.gameState === 'playing') {
          console.log(`Only ${connectedPlayersCount} connected player(s) remaining, waiting for reconnections...`);
          
          // Wait longer for reconnections since this is a disconnect, not intentional leave
          setTimeout(() => {
            const currentGameRoom = gameStateManager.getGameRoom(roomId);
            const currentConnectedCount = gameStateManager.getPlayerCount(roomId);
            
            if (currentGameRoom && 
                currentGameRoom.gameState === 'playing' && 
                currentConnectedCount <= 1) {
              console.log(`Still only ${currentConnectedCount} connected player(s) after grace period, ending game...`);
              gameLogic.endGameDueToInsufficientPlayers(roomId);
            }
          }, 30000); // 30 seconds grace period for reconnection
        }
        
        // Update player list
        io.to(roomId).emit("playerUpdate", {
          players: gameStateManager.getAllPlayers(roomId),
          playerCount: connectedPlayersCount,
          canStart: false // Reset canStart when someone disconnects
        });
        
        if (disconnectedPlayer) {
          // Notify clients a user has left the video call and room
          io.to(roomId).emit("user-left", socket.id);
          io.to(roomId).emit("leaveMessage", {
            message: `${disconnectedPlayer.username} has disconnected.`,
          });
        }
      }
    });
  });
}