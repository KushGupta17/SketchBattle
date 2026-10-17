import { useNavigate, useParams } from "react-router-dom";
import { Button, message } from "antd";
import { useState } from "react";
import {
  LuLogOut,
  LuCopy,
  LuCheck,
  LuVolume2,
  LuVolumeX,
  LuSparkles,
} from "react-icons/lu";
import Cookies from "js-cookie";
import axios from "axios";
import { backend_url } from "../../utils/backend_url";
import { soundEffects } from "../../utils/soundEffects";
import { getAvatarColor, getInitials } from "../../utils/avatarUtils";

interface NavbarProps {
  socket?: any;
}

const Navbar = ({ socket }: NavbarProps) => {
  const username = Cookies.get("username") || "Player";
  const { roomId } = useParams<{ roomId: string }>();
  const domain = window.location.origin;

  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isMuted, setIsMuted] = useState(() => soundEffects.getMuted());

  const avatar = getAvatarColor(username);

  const handleToggleMute = () => {
    const muted = soundEffects.toggleMute();
    setIsMuted(muted);
    if (muted) {
      message.info("Audio muted");
    } else {
      message.success("Audio unmuted");
      soundEffects.playCloseGuess();
    }
  };

  const handleLogout = () => {
    const logout = async () => {
      try {
        setLoading(true);

        if (socket && roomId && username) {
          socket.emit("leaveRoom", roomId, username);
          await new Promise((resolve) => setTimeout(resolve, 300));
        }

        const res = await axios.post(
          `${backend_url}/api/logout`,
          { roomId },
          {
            headers: {
              Authorization: `Bearer ${Cookies.get("token")}`,
              Accept: "application/json",
            },
          }
        );

        if (res.status === 200) {
          Cookies.remove("token");
          Cookies.remove("username");
          if (socket) socket.disconnect();
          message.success("Left room");
          navigate("/");
        }
      } catch (error) {
        if (socket) {
          socket.emit("leaveRoom", roomId, username);
          socket.disconnect();
        }
        Cookies.remove("token");
        Cookies.remove("username");
        navigate("/");
      } finally {
        setLoading(false);
      }
    };
    logout();
  };

  const copyInviteLink = () => {
    const inviteLink = `${domain}?roomId=${roomId}`;
    navigator.clipboard.writeText(inviteLink).then(() => {
      setCopied(true);
      message.success("Invite link copied!");
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <header className="h-14 sm:h-16 shrink-0 bg-white/90 backdrop-blur-md border-b border-indigo-100 shadow-xs sticky top-0 z-40 transition-colors duration-150">
      <div className="h-full max-w-7xl mx-auto px-2.5 sm:px-4 md:px-6 flex justify-between items-center gap-2">
        {/* Left: Brand & Player */}
        <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
          <div
            onClick={() => navigate("/")}
            className="flex items-center space-x-1.5 cursor-pointer group shrink-0"
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 text-white flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
              <LuSparkles className="w-4 h-4" />
            </div>
            <span className="font-extrabold text-base sm:text-lg tracking-tight bg-gradient-to-r from-indigo-700 via-purple-700 to-pink-600 bg-clip-text text-transparent hidden sm:inline">
              SketchBattle
            </span>
          </div>

          {/* User Avatar Chip */}
          <div className="flex items-center space-x-1.5 bg-gray-100/80 border border-gray-200/80 px-2 py-1 rounded-xl max-w-[120px] sm:max-w-[160px] truncate">
            <div
              className={`w-5 h-5 rounded-lg flex items-center justify-center font-bold text-[10px] shrink-0 ${avatar.bg} ${avatar.text}`}
            >
              {getInitials(username)}
            </div>
            <span className="font-semibold text-xs sm:text-sm text-gray-800 truncate">
              {username}
            </span>
          </div>
        </div>

        {/* Center: Room Code Chip */}
        <div className="flex items-center space-x-1.5 sm:space-x-2">
          <div
            onClick={copyInviteLink}
            className="flex items-center space-x-1.5 bg-indigo-50/80 hover:bg-indigo-100 border border-indigo-200/80 px-2.5 py-1 rounded-xl cursor-pointer transition-all active:scale-95 group"
            title="Click to copy invite link"
          >
            <span className="text-[11px] uppercase tracking-wider font-bold text-indigo-500 hidden md:inline">
              Room
            </span>
            <span className="font-mono font-bold text-xs sm:text-sm text-indigo-900 tracking-wide">
              {roomId}
            </span>
            {copied ? (
              <LuCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            ) : (
              <LuCopy className="w-3.5 h-3.5 text-indigo-500 group-hover:text-indigo-700 shrink-0" />
            )}
          </div>
        </div>

        {/* Right: Audio toggle & Leave room */}
        <div className="flex items-center space-x-1 sm:space-x-2 shrink-0">
          <button
            type="button"
            onClick={handleToggleMute}
            className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center border transition-all active:scale-95 ${
              isMuted
                ? "bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-100"
                : "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100"
            }`}
            title={isMuted ? "Unmute audio" : "Mute audio"}
          >
            {isMuted ? (
              <LuVolumeX className="w-4 h-4" />
            ) : (
              <LuVolume2 className="w-4 h-4" />
            )}
          </button>

          <Button
            onClick={handleLogout}
            icon={<LuLogOut className="w-3.5 h-3.5" />}
            loading={loading}
            className="!h-8 sm:!h-9 !px-2.5 sm:!px-3 !rounded-xl !bg-gray-100 hover:!bg-rose-50 hover:!text-rose-600 hover:!border-rose-200 !text-gray-700 !font-semibold !text-xs sm:!text-sm transition-all"
          >
            <span className="hidden sm:inline">Leave</span>
          </Button>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
