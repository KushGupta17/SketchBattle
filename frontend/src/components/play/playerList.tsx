import { Button } from "antd";
import {
  LuCrown,
  LuWifi,
  LuWifiOff,
  LuUsers,
  LuCheck,
  LuTrophy,
  LuSparkles,
} from "react-icons/lu";
import Cookies from "js-cookie";
import { getAvatarColor, getInitials } from "../../utils/avatarUtils";

const PlayerList = ({
  players,
  gameState,
  isReady,
  toggleReady,
  canStart,
}: any) => {
  const readyCount = players.filter((p: any) => p.isReady).length;
  const totalPlayers = players.length;
  const currentUsername = Cookies.get("username");

  return (
    <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-md border border-purple-100 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-100">
        <h3 className="font-bold text-gray-800 flex items-center text-sm sm:text-base">
          <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center mr-2">
            <LuUsers className="w-4 h-4" />
          </div>
          Lobby Players ({totalPlayers})
        </h3>
        {gameState.state === "waiting" && (
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
            {readyCount}/{totalPlayers} ready
          </span>
        )}
      </div>

      {/* Players List */}
      <div className="space-y-2 max-h-56 overflow-y-auto mb-3 pr-1 [scrollbar-gutter:stable]">
        {players.map((player: any) => {
          const isDrawer = gameState.currentDrawer === player.username;
          const isMe = player.username === currentUsername;
          const avatar = getAvatarColor(player.username);
          const score = gameState.scores[player.userId] || 0;

          return (
            <div
              key={player.userId}
              className={`flex justify-between items-center p-2.5 sm:p-3 rounded-xl transition-colors duration-150 ${
                isDrawer
                  ? "bg-gradient-to-r from-purple-50 via-pink-50 to-amber-50 border-2 border-purple-300 shadow-sm"
                  : player.isReady && gameState.state === "waiting"
                  ? "bg-emerald-50/80 border border-emerald-200"
                  : "bg-gray-50/80 border border-gray-100 hover:bg-gray-100/80"
              } ${!player.isConnected ? "opacity-60" : ""}`}
            >
              <div className="flex items-center space-x-2.5 min-w-0">
                {/* Avatar with status indicator */}
                <div className="relative shrink-0">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shadow-xs ${avatar.bg} ${avatar.text} border ${avatar.border}`}
                  >
                    {getInitials(player.username)}
                  </div>
                  {isDrawer && (
                    <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-amber-400 text-amber-950 flex items-center justify-center shadow-xs">
                      <LuCrown className="w-3 h-3 fill-current" />
                    </div>
                  )}
                </div>

                {/* Player details */}
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span
                      className={`font-bold text-xs sm:text-sm truncate ${
                        isDrawer
                          ? "text-purple-800"
                          : "text-gray-800"
                      }`}
                    >
                      {player.username}
                    </span>
                    {isMe && (
                      <span className="text-[10px] font-semibold bg-indigo-100 text-indigo-700 px-1.5 py-0.2 rounded-full">
                        you
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1 text-[11px] text-gray-500">
                    {player.isConnected ? (
                      <span className="flex items-center gap-0.5 text-emerald-600">
                        <LuWifi className="w-3 h-3" /> Online
                      </span>
                    ) : (
                      <span className="flex items-center gap-0.5 text-gray-400">
                        <LuWifiOff className="w-3 h-3" /> Offline
                      </span>
                    )}
                    {isDrawer && (
                      <span className="text-purple-600 font-semibold">• Drawing now</span>
                    )}
                    {player.isReady && gameState.state === "waiting" && (
                      <span className="text-emerald-600 flex items-center gap-0.5">
                        • <LuCheck className="w-3 h-3" /> Ready
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Score pill */}
              <div className="text-right shrink-0 pl-2">
                <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white shadow-xs border border-gray-100 font-bold text-xs sm:text-sm text-gray-800">
                  <LuTrophy className="w-3.5 h-3.5 text-amber-500" />
                  <span>{score}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Waiting Lobby Action */}
      {gameState.state === "waiting" && (
        <div className="space-y-2 pt-2 border-t border-gray-100">
          <Button
            type={isReady ? "default" : "primary"}
            onClick={toggleReady}
            block
            size="large"
            className={`!h-11 !rounded-xl !font-bold transition-all shadow-md ${
              isReady
                ? "!border-emerald-300 !text-emerald-700 !bg-emerald-50 hover:!bg-emerald-100"
                : "!border-0 !bg-gradient-to-r !from-indigo-600 !to-purple-600 hover:!from-indigo-500 hover:!to-purple-500 hover:scale-102"
            }`}
          >
            {isReady ? "✓ You're Ready!" : "⚡ Tap When Ready"}
          </Button>

          {canStart ? (
            <div className="text-center">
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-bold text-xs shadow-sm animate-bounce">
                <LuSparkles className="w-3.5 h-3.5" /> Starting Game Soon...
              </div>
            </div>
          ) : (
            <p className="text-center text-xs text-gray-500">
              {readyCount === totalPlayers && totalPlayers >= 2
                ? "All players ready! Starting..."
                : `Need ${Math.max(2 - totalPlayers, 0)} more player(s) to begin`}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default PlayerList;
