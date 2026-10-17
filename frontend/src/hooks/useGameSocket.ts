import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import Cookies from "js-cookie";
import { message as m } from "antd";
import { Player, GameState, ChatMessage } from "../types/types";
import { backend_url } from "../utils/backend_url";
import { soundEffects } from "../utils/soundEffects";
import { useVoiceFeedback } from "./useVoiceFeedback";

interface UseGameSocketProps {
  roomId?: string;
}

export const useGameSocket = ({ roomId }: UseGameSocketProps) => {
  const token = Cookies.get("token");
  const navigate = useNavigate();
  const { speak } = useVoiceFeedback({ enabled: true, volume: 1 });

  const [username, setUsername] = useState<string>(
    Cookies.get("username") || ""
  );
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [message, setMessage] = useState<string>("");
  const [players, setPlayers] = useState<Player[]>([]);
  const [isReady, setIsReady] = useState<boolean>(false);
  const [canStart, setCanStart] = useState<boolean>(false);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [wordChoices, setWordChoices] = useState<string[]>([]);
  const [currentWord, setCurrentWord] = useState<string>("");
  const [wordHint, setWordHint] = useState<string>("");
  const [isCurrentDrawer, setIsCurrentDrawer] = useState<boolean>(false);
  const [roundResults, setRoundResults] = useState<any>(null);
  const [gameResults, setGameResults] = useState<any>(null);

  const [preparationCountdown, setPreparationCountdown] = useState<number>(0);
  const [showPreparation, setShowPreparation] = useState<boolean>(false);
  const [currentTurn, setCurrentTurn] = useState<number>(0);
  const [totalTurnsInRound, setTotalTurnsInRound] = useState<number>(0);

  const [gameState, setGameState] = useState<GameState>({
    state: "waiting",
    round: 0,
    totalRounds: 3,
    players: [],
    scores: {},
    currentDrawer: null,
    timeLeft: 0,
  });

  const [activeModal, setActiveModal] = useState<
    "none" | "wordSelect" | "roundResult" | "gameEnd"
  >("none");

  const lastWarnSecond = useRef<number>(-1);

  // Initialize Socket.IO connection
  const socket = useMemo(() => {
    if (!token) return null;
    return io(`${backend_url}`, {
      auth: { token },
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
  }, [token]);

  const openModal = useCallback((modal: "wordSelect" | "roundResult" | "gameEnd") => {
    setActiveModal(modal);
  }, []);

  const closeAllModals = useCallback(() => {
    setActiveModal("none");
  }, []);

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    return `${Math.floor(seconds / 60)}:${(seconds % 60)
      .toString()
      .padStart(2, "0")}`;
  };

  const toggleReady = () => {
    if (socket) {
      socket.emit("playerReady");
    }
  };

  const selectWord = (word: string) => {
    if (socket) {
      socket.emit("selectWord", word);
      closeAllModals();
    }
  };

  const sendMessage = () => {
    if (!message.trim() || !socket || !roomId) return;

    const chatMessage: ChatMessage = {
      message: message.trim(),
      roomId,
      username: Cookies.get("username") || "",
    };

    socket.emit("chatMessage", chatMessage);
    setMessage("");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Auth verification
  useEffect(() => {
    if (!token) {
      m.error("You must be logged in to access this page");
      navigate("/");
    }
  }, [token, navigate]);

  // Socket room connection
  useEffect(() => {
    if (!socket || !roomId) return;

    const handleConnect = () => {
      const storedUsername = Cookies.get("username") || "";
      setUsername(storedUsername);
      socket.emit("joinRoom", roomId, storedUsername);
    };

    if (socket.connected) {
      handleConnect();
    }

    socket.on("connect", handleConnect);
    socket.on("disconnect", () => {
      m.warning("Disconnected from server.");
    });
    socket.io.on("reconnect", () => {
      m.info("Reconnected to server!");
    });

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect");
      socket.io.off("reconnect");
    };
  }, [socket, roomId]);

  // Main gameplay event listeners
  useEffect(() => {
    if (!socket) return;

    socket.on("gameState", (state: GameState) => {
      setGameState(state);
      setTimeLeft(state.timeLeft);

      const currentUsername = Cookies.get("username");
      const isDrawer = state.currentDrawer === currentUsername;
      setIsCurrentDrawer(isDrawer);
    });

    socket.on(
      "timeUpdate",
      (data: { timeLeft: number; roundEndTime: number; wordHint?: string }) => {
        setTimeLeft(data.timeLeft);
        if (data.timeLeft <= 10000 && data.timeLeft > 0) {
          const sec = Math.floor(data.timeLeft / 1000);
          if (sec !== lastWarnSecond.current) {
            lastWarnSecond.current = sec;
            soundEffects.playTimeWarning();
          }
        }
        if (data.wordHint && !isCurrentDrawer) {
          setWordHint(data.wordHint);
        }
      }
    );

    socket.on("playerUpdate", (data: any) => {
      setPlayers(data.players);
      setCanStart(data.canStart || false);
      const currentPlayer = data.players.find(
        (p: Player) => p.username === username
      );
      setIsReady(currentPlayer?.isReady || false);
    });

    socket.on("gameStarting", (data: any) => {
      m.success(data.message);
      setCanStart(false);
      setGameState((prev) => ({
        ...prev,
        state: "playing",
      }));
    });

    socket.on("newTurn", (data: any) => {
      soundEffects.playTurnStart();
      setShowPreparation(true);
      setCurrentTurn(data.turnInRound);
      setTotalTurnsInRound(data.totalTurnsInRound);

      const currentUsername = Cookies.get("username");
      const isDrawer = data.drawer === currentUsername;
      setIsCurrentDrawer(isDrawer);

      setGameState((prev) => ({
        ...prev,
        state: "playing",
        round: data.round,
        totalRounds: data.totalRounds || 3,
        currentDrawer: data.drawer,
      }));

      closeAllModals();

      if (isDrawer) {
        speak("It's your turn to draw!");
        m.info(`Turn ${data.turnInRound}: It's your turn to draw!`);
      } else {
        speak(`${data.drawer} will draw next!`);
        m.info(
          `Turn ${data.turnInRound}: ${data.drawer} is preparing to draw!`
        );
      }
    });

    socket.on("preparationCountdown", (data: any) => {
      setPreparationCountdown(data.countdown);
      if (data.countdown <= 0) {
        setShowPreparation(false);
      }
    });

    socket.on("wordChoices", (data: any) => {
      setWordChoices(data.words);
      openModal("wordSelect");
    });

    socket.on("drawingPhase", (data: any) => {
      setShowPreparation(false);
      setCurrentTurn(data.turn);

      const currentUsername = Cookies.get("username");
      const isDrawer = data.drawer === currentUsername;
      setIsCurrentDrawer(isDrawer);

      setGameState((prev) => ({
        ...prev,
        state: "playing",
        round: data.round,
        currentDrawer: data.drawer,
      }));

      if (!isDrawer) {
        setWordHint(data.word);
      }

      closeAllModals();

      if (isDrawer) {
        m.success("Start drawing now!");
      } else {
        m.info(`${data.drawer} is now drawing! Try to guess the word!`);
      }
    });

    socket.on("drawerWord", (data: any) => {
      const currentUsername = Cookies.get("username");
      if (gameState.currentDrawer === currentUsername) {
        setCurrentWord(data.word);
      }
    });

    socket.on("correctGuess", (data: any) => {
      soundEffects.playCorrectGuess();
      m.success(`${data.username} guessed correctly! +${data.points} points`);
      if (data.username === Cookies.get("username")) {
        speak("Correct! Well done!");
      } else {
        speak(`${data.username} got it right!`);
      }
    });

    socket.on("scoreUpdate", (data: any) => {
      setGameState((prev) => ({ ...prev, scores: data.scores }));
    });

    socket.on("drawerPenalty", (data: any) => {
      soundEffects.playPenalty();
      m.error({
        content: `😞 No one guessed! ${data.message} (-${data.penalty} pts)`,
        duration: 4,
      });
    });

    socket.on("turnEnd", (data: any) => {
      if (data.noOneGuessed) {
        m.warning({
          content: `The word was: "${data.word}" - No one guessed it!`,
          duration: 3,
        });
      } else {
        m.success({
          content: `The word was: "${data.word}"`,
          duration: 3,
        });
      }

      setGameState((prev) => ({
        ...prev,
        scores: data.scores,
      }));

      setRoundResults({
        round: data.round,
        totalRounds: data.totalRounds || 3,
        turnInRound: data.turnInRound,
        totalTurnsInRound: data.totalTurnsInRound,
        scores: data.scores,
        word: data.word,
        drawer: data.drawer,
        guessedPlayers: data.guessedPlayers || [],
        noOneGuessed: data.noOneGuessed,
        drawerPointsAwarded: data.drawerPointsAwarded,
        isTurnResult: true,
        isLastTurnOfRound: data.turnInRound === data.totalTurnsInRound,
        isGameEnding:
          data.round >= data.totalRounds &&
          data.turnInRound === data.totalTurnsInRound,
      });

      openModal("roundResult");
    });

    socket.on("roundComplete", (data: any) => {
      m.success(`Round ${data.round} completed!`);
    });

    socket.on("gameEnd", (data: any) => {
      soundEffects.playGameEnd();
      setGameResults(data);
      setGameState((prev) => ({ ...prev, state: "ended" }));

      if (data.reason === "insufficient_players") {
        m.warning({
          content: data.message,
          duration: 5,
        });
      } else {
        m.success({
          content: "Game completed! Check the final results.",
          duration: 3,
        });
      }

      openModal("gameEnd");
    });

    socket.on("chatMessage", (message: ChatMessage) => {
      if (message.username === "System" && message.message?.includes("is very close!")) {
        soundEffects.playCloseGuess();
      }
      setMessages((prev) => [...prev, message]);
    });

    socket.on("joinMessage", (data: any) => {
      setMessages((prev) => [...prev, { ...data, username: "System" }]);
    });

    socket.on("leaveMessage", (data: any) => {
      setMessages((prev) => [...prev, { ...data, username: "System" }]);
      setPlayers((prev) =>
        prev.filter((player) => player.username !== data.username)
      );
    });

    socket.on("gameReset", (data: any) => {
      setGameState({
        state: "waiting",
        round: 0,
        totalRounds: 3,
        players: [],
        scores: {},
        currentDrawer: null,
        timeLeft: 0,
      });
      setIsReady(false);
      setCanStart(false);
      setTimeLeft(0);
      setCurrentWord("");
      setWordHint("");
      setIsCurrentDrawer(false);
      closeAllModals();
      sessionStorage.removeItem(`canvas-${roomId}`);
      m.info(data.message);
    });

    return () => {
      socket.off("gameState");
      socket.off("timeUpdate");
      socket.off("playerUpdate");
      socket.off("gameStarting");
      socket.off("newTurn");
      socket.off("preparationCountdown");
      socket.off("wordChoices");
      socket.off("drawingPhase");
      socket.off("drawerWord");
      socket.off("correctGuess");
      socket.off("scoreUpdate");
      socket.off("turnEnd");
      socket.off("roundComplete");
      socket.off("gameEnd");
      socket.off("chatMessage");
      socket.off("joinMessage");
      socket.off("leaveMessage");
      socket.off("gameReset");
      socket.off("drawerPenalty");
    };
  }, [socket, username, roomId, gameState.currentDrawer, isCurrentDrawer, openModal, closeAllModals, speak]);

  return {
    socket,
    username,
    messages,
    message,
    setMessage,
    sendMessage,
    handleKeyPress,
    players,
    isReady,
    canStart,
    timeLeft,
    formatTime,
    wordChoices,
    currentWord,
    wordHint,
    isCurrentDrawer,
    setIsCurrentDrawer,
    roundResults,
    gameResults,
    preparationCountdown,
    showPreparation,
    currentTurn,
    totalTurnsInRound,
    gameState,
    activeModal,
    openModal,
    closeAllModals,
    toggleReady,
    selectWord,
  };
};
