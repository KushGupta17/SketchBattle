import { Button, message } from "antd";
import axios from "axios";
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Cookies from "js-cookie";
import { backend_url } from "../../utils/backend_url";
import {
  LuSparkles,
  LuPencil,
  LuLightbulb,
  LuTrophy,
  LuPlay,
  LuSettings2,
  LuPalette,
} from "react-icons/lu";
import { getAvatarColor, getInitials } from "../../utils/avatarUtils";

const Page = () => {
  const [username, setUsername] = useState(
    Cookies.get("username") || ""
  );
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const [joinRoomId, setJoinRoomId] = useState(queryParams.get("roomId") || "");
  const [joinRoomPassword, setJoinRoomPassword] = useState("");
  const [roomId, setRoomId] = useState("");
  const [password, setPassword] = useState("");
  const [state, setState] = useState<"join" | "create">("join");
  const [loading, setLoading] = useState(false);
  const [rounds, setRounds] = useState<number>(3);
  const [drawTime, setDrawTime] = useState<number>(80);
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard" | "mixed">("medium");
  const [customWords, setCustomWords] = useState<string>("");
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);
  const navigate = useNavigate();

  const avatar = getAvatarColor(username);

  const handleJoinRoom = () => {
    if (!username.trim()) {
      message.error("Please enter a username");
      return;
    }
    if (!joinRoomId.trim()) {
      message.error("Please enter a room ID");
      return;
    }
    if (!joinRoomPassword.trim()) {
      message.error("Please enter a password");
      return;
    }

    Cookies.set("username", username.trim(), { expires: 1 });
    async function joinRoom() {
      try {
        setLoading(true);
        const res = await axios.post(
          `${backend_url}/api/rooms/join`,
          {
            username: username.trim(),
            roomId: joinRoomId.trim(),
            password: joinRoomPassword,
          },
          {
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        if (res.status === 200) {
          Cookies.set("token", res.data.token, { expires: 1 });
          Cookies.set("username", username.trim(), { expires: 1 });
          navigate(`/play/${joinRoomId}`);
        }
      } catch (err: any) {
        message.error(err.response?.data?.message || "Failed to join room");
      } finally {
        setLoading(false);
      }
    }
    joinRoom();
  };

  const handleCreateRoom = () => {
    if (!username.trim()) {
      message.error("Please enter a username");
      return;
    }
    if (!roomId.trim()) {
      message.error("Please enter a room ID");
      return;
    }
    if (!password.trim()) {
      message.error("Please enter a password");
      return;
    }

    Cookies.set("username", username.trim(), { expires: 1 });
    async function createRoom() {
      try {
        setLoading(true);
        const res = await axios.post(
          `${backend_url}/api/rooms/create`,
          {
            roomId: roomId.trim(),
            username: username.trim(),
            password: password,
            settings: {
              rounds,
              drawTime,
              difficulty,
              customWords: customWords
                .split(",")
                .map((w) => w.trim().toLowerCase())
                .filter((w) => w.length >= 2),
            },
          },
          {
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        if (res.status === 201) {
          Cookies.set("token", res.data.token, { expires: 1 });
          navigate(`/play/${roomId}`);
        }
      } catch (err: any) {
        message.error(err.response?.data?.message || "Failed to create room");
      } finally {
        setLoading(false);
      }
    }
    createRoom();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50/70 via-purple-50/50 to-indigo-50/80 relative overflow-x-hidden">
      {/* Decorative joyful doodles in background */}
      <div
        className="absolute inset-0 pointer-events-none opacity-40"
        style={{
          backgroundImage: "radial-gradient(circle, #cbd5e1 1.2px, transparent 1.2px)",
          backgroundSize: "28px 28px",
        }}
      />

      <div className="relative z-10 min-h-screen flex flex-col justify-between px-3 sm:px-6 py-6 md:py-10 max-w-5xl mx-auto">
        {/* Playful Header */}
        <header className="text-center pt-2 pb-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/90 border border-purple-200/80 shadow-xs mb-3 animate-float-slow">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold text-purple-900 tracking-wide uppercase">
              Real-time Multiplayer Drawing Game
            </span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight text-gray-900 mb-2">
            <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 bg-clip-text text-transparent">
              SketchBattle
            </span>
            <span className="inline-block ml-2 text-3xl sm:text-4xl">🎨</span>
          </h1>

          <p className="text-sm sm:text-base max-w-md mx-auto text-gray-600 font-medium">
            Draw funny sketches, guess words with friends, and race to the top of the leaderboard!
          </p>
        </header>

        {/* Main Card */}
        <main className="w-full max-w-md mx-auto my-auto">
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-purple-100/80 p-5 sm:p-7 transition-all">
            {/* Playful Mode Toggle */}
            <div className="bg-slate-100/80 p-1.5 rounded-2xl flex gap-1.5 mb-5 shadow-inner">
              <button
                type="button"
                onClick={() => setState("join")}
                className={`flex-1 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  state === "join"
                    ? "bg-white text-indigo-700 shadow-sm scale-101"
                    : "text-gray-500 hover:text-gray-800"
                }`}
              >
                <LuPlay className="w-4 h-4" />
                Join Room
              </button>

              <button
                type="button"
                onClick={() => setState("create")}
                className={`flex-1 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  state === "create"
                    ? "bg-white text-purple-700 shadow-sm scale-101"
                    : "text-gray-500 hover:text-gray-800"
                }`}
              >
                <LuSparkles className="w-4 h-4" />
                Create Room
              </button>
            </div>

            {/* Username Input with Avatar Preview */}
            <div className="mb-5">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1">
                  <LuPalette className="text-purple-600" /> Your Player Name
                </label>
                {username.trim() && (
                  <span className="text-[11px] font-semibold text-purple-700">
                    Looks great! ✨
                  </span>
                )}
              </div>

              <div className="relative flex items-center">
                <input
                  type="text"
                  placeholder="e.g. MasterArtist"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-400 focus:bg-white text-sm font-semibold text-gray-800 transition-all shadow-inner"
                  maxLength={20}
                />
                <div
                  className={`absolute left-2.5 w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold shadow-xs ${avatar.bg} ${avatar.text} border ${avatar.border}`}
                >
                  {getInitials(username)}
                </div>
              </div>
            </div>

            {/* JOIN ROOM TAB */}
            {state === "join" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Room Code
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. FUNNY_LOBBY"
                    value={joinRoomId}
                    onChange={(e) => setJoinRoomId(e.target.value.toUpperCase())}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:bg-white text-sm font-mono font-bold text-gray-800 transition-all uppercase"
                    maxLength={15}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Room Password
                  </label>
                  <input
                    type="password"
                    placeholder="Enter room password"
                    value={joinRoomPassword}
                    onChange={(e) => setJoinRoomPassword(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:bg-white text-sm font-semibold text-gray-800 transition-all"
                  />
                </div>

                <Button
                  type="primary"
                  size="large"
                  icon={<LuPlay className="w-4 h-4" />}
                  loading={loading}
                  onClick={handleJoinRoom}
                  className="w-full !h-12 !rounded-2xl !bg-gradient-to-r !from-indigo-600 !to-purple-600 hover:!from-indigo-500 hover:!to-purple-500 !border-0 !text-base !font-bold shadow-lg hover:shadow-xl hover:scale-101 active:scale-99 transition-all cursor-pointer mt-2"
                >
                  Join Game 🚀
                </Button>
              </div>
            )}

            {/* CREATE ROOM TAB */}
            {state === "create" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Custom Room ID
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. COOL_ROOM"
                    value={roomId}
                    onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-400 focus:bg-white text-sm font-mono font-bold text-gray-800 transition-all uppercase"
                    maxLength={15}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Set Room Password
                  </label>
                  <input
                    type="password"
                    placeholder="Create a room password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-400 focus:bg-white text-sm font-semibold text-gray-800 transition-all"
                  />
                </div>

                {/* Friendly Room Settings */}
                <div className="pt-2">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1">
                      <LuSettings2 className="text-indigo-600" /> Game Settings
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowAdvanced(!showAdvanced)}
                      className="text-xs text-indigo-600 hover:text-indigo-800 font-bold cursor-pointer"
                    >
                      {showAdvanced ? "Hide" : "Customize"}
                    </button>
                  </div>

                  {showAdvanced && (
                    <div className="space-y-3 bg-purple-50/50 p-3.5 rounded-2xl border border-purple-100 text-xs transition-all">
                      {/* Rounds */}
                      <div className="flex items-center justify-between">
                        <span className="text-gray-700 font-bold">Rounds:</span>
                        <div className="flex gap-1.5">
                          {[2, 3, 5, 8].map((r) => (
                            <button
                              key={r}
                              type="button"
                              onClick={() => setRounds(r)}
                              className={`px-2.5 py-1 rounded-xl font-bold transition-all ${
                                rounds === r
                                  ? "bg-purple-600 text-white shadow-xs"
                                  : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
                              }`}
                            >
                              {r}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Turn Draw Time */}
                      <div className="flex items-center justify-between">
                        <span className="text-gray-700 font-bold">Draw Time:</span>
                        <div className="flex gap-1.5">
                          {[45, 60, 80, 100].map((t) => (
                            <button
                              key={t}
                              type="button"
                              onClick={() => setDrawTime(t)}
                              className={`px-2.5 py-1 rounded-xl font-bold transition-all ${
                                drawTime === t
                                  ? "bg-purple-600 text-white shadow-xs"
                                  : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
                              }`}
                            >
                              {t}s
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Difficulty Tiers */}
                      <div className="flex items-center justify-between">
                        <span className="text-gray-700 font-bold">Words:</span>
                        <div className="flex gap-1">
                          {(
                            [
                              { id: "easy", label: "🟢 Easy" },
                              { id: "medium", label: "🟡 Med" },
                              { id: "hard", label: "🔴 Hard" },
                              { id: "mixed", label: "🌈 All" },
                            ] as const
                          ).map((item) => (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => setDifficulty(item.id)}
                              className={`px-2 py-1 rounded-xl font-bold transition-all ${
                                difficulty === item.id
                                  ? "bg-purple-600 text-white shadow-xs"
                                  : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
                              }`}
                            >
                              {item.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Custom Words */}
                      <div>
                        <span className="text-gray-700 font-bold block mb-1">
                          Custom Word List (optional):
                        </span>
                        <input
                          type="text"
                          placeholder="pikachu, pizza, airplane, guitar"
                          value={customWords}
                          onChange={(e) => setCustomWords(e.target.value)}
                          className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-purple-400 text-gray-800 text-xs"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <Button
                  type="primary"
                  size="large"
                  icon={<LuSparkles className="w-4 h-4" />}
                  loading={loading}
                  onClick={handleCreateRoom}
                  className="w-full !h-12 !rounded-2xl !bg-gradient-to-r !from-purple-600 !to-pink-600 hover:!from-purple-500 hover:!to-pink-500 !border-0 !text-base !font-bold shadow-lg hover:shadow-xl hover:scale-101 active:scale-99 transition-all cursor-pointer mt-2"
                >
                  Create Room ✨
                </Button>
              </div>
            )}
          </div>
        </main>

        {/* Playful How to Play Cards */}
        <footer className="pt-8 pb-2">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 max-w-3xl mx-auto">
            <div className="bg-white/80 backdrop-blur-md rounded-2xl p-4 border border-indigo-100 shadow-xs flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                <LuPencil className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-gray-900 text-xs sm:text-sm">Draw & Express</h4>
                <p className="text-gray-500 text-xs">Use brush, flood fill, colors, and undo.</p>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-md rounded-2xl p-4 border border-purple-100 shadow-xs flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                <LuLightbulb className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-gray-900 text-xs sm:text-sm">Guess in Chat</h4>
                <p className="text-gray-500 text-xs">Type your answer or use instant voice input.</p>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-md rounded-2xl p-4 border border-pink-100 shadow-xs flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-pink-100 text-pink-700 flex items-center justify-center shrink-0">
                <LuTrophy className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-gray-900 text-xs sm:text-sm">Score & Win</h4>
                <p className="text-gray-500 text-xs">Tiered points for early correct guessers.</p>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default Page;
