import { Modal, Button } from "antd";
import { LuCrown, LuTrophy, LuUsers, LuSparkles } from "react-icons/lu";
import { getAvatarColor, getInitials } from "../../../utils/avatarUtils";

const RoundResultModal = ({
  showResultsModal,
  setShowResultsModal,
  roundResults,
  players,
  gameState,
}: any) => {
  if (!roundResults) return null;

  const getSortedPlayers = () => {
    return players
      .map((player: any) => ({
        ...player,
        score: gameState.scores[player.userId] || 0,
      }))
      .sort((a: any, b: any) => b.score - a.score);
  };

  const getModalTitle = () => {
    if (roundResults.isGameEnding) {
      return "🎉 Final Round Complete!";
    } else if (roundResults.isLastTurnOfRound) {
      return `🌟 Round ${roundResults.round} Complete!`;
    } else {
      return `Turn ${roundResults.turnInRound}/${roundResults.totalTurnsInRound} Wrap-Up`;
    }
  };

  const getButtonText = () => {
    if (roundResults.isGameEnding) {
      return "View Final Standings 🏆";
    } else if (roundResults.isLastTurnOfRound) {
      return `Start Round ${roundResults.round + 1} 🚀`;
    } else {
      return "Next Turn 🎨";
    }
  };

  return (
    <Modal
      title={null}
      open={showResultsModal}
      footer={
        <Button
          type="primary"
          onClick={() => setShowResultsModal(false)}
          size="large"
          className="w-full !h-12 !rounded-2xl !bg-gradient-to-r !from-indigo-600 !to-purple-600 hover:!from-indigo-500 hover:!to-purple-500 !border-0 !text-base !font-bold shadow-lg hover:scale-101 active:scale-99 transition-all"
        >
          {getButtonText()}
        </Button>
      }
      closable={false}
      maskClosable={false}
      centered
      width={480}
    >
      <div className="space-y-4 py-2">
        {/* Title */}
        <div className="text-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-100 text-purple-700 text-xs font-bold mb-2">
            <LuSparkles className="w-3.5 h-3.5" />
            {getModalTitle()}
          </div>

          {/* Word Reveal Banner */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 border border-purple-200 shadow-xs">
            <span className="text-xs uppercase tracking-wider font-bold text-gray-500">
              The secret word was
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-indigo-950 uppercase tracking-wide my-1">
              {roundResults.word}
            </h2>
            <div className="inline-flex items-center gap-1.5 text-xs text-purple-700 font-semibold bg-white/80 px-2.5 py-1 rounded-full shadow-2xs">
              <LuUsers className="w-3.5 h-3.5" />
              Drawn by {roundResults.drawer}
            </div>
          </div>
        </div>

        {/* Drawer Score Summary */}
        {roundResults.drawerPointsAwarded !== undefined && (
          <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-200 text-xs sm:text-sm">
            <span className="font-medium text-gray-700">
              Drawer Bonus ({roundResults.drawer}):
            </span>
            <span
              className={`font-bold px-2 py-0.5 rounded-lg ${
                roundResults.drawerPointsAwarded > 0
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-rose-100 text-rose-800"
              }`}
            >
              {roundResults.drawerPointsAwarded > 0 ? "+" : ""}
              {roundResults.drawerPointsAwarded} pts
            </span>
          </div>
        )}

        {/* Guessers Podium */}
        {roundResults.guessedPlayers && roundResults.guessedPlayers.length > 0 ? (
          <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200">
            <h4 className="font-bold text-xs uppercase tracking-wider text-emerald-900 mb-2.5 flex items-center gap-1.5">
              <LuTrophy className="w-4 h-4 text-emerald-600" />
              Correct Guessers:
            </h4>
            <div className="space-y-1.5">
              {roundResults.guessedPlayers.map((playerName: string, index: number) => {
                const medals = ["🥇 1st", "🥈 2nd", "🥉 3rd"];
                const pts = index === 0 ? "+120 pts" : index === 1 ? "+110 pts" : index === 2 ? "+100 pts" : "+80 pts";

                return (
                  <div
                    key={playerName}
                    className="flex justify-between items-center bg-white p-2 px-3 rounded-xl shadow-2xs text-xs sm:text-sm font-semibold"
                  >
                    <span className="flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-600">
                        {medals[index] || `#${index + 1}`}
                      </span>
                      <span className="text-gray-800">{playerName}</span>
                    </span>
                    <span className="text-emerald-600 font-bold">{pts}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-center text-xs sm:text-sm text-amber-800 font-medium">
            No one guessed this round. Good effort all around!
          </div>
        )}

        {/* Leaderboard snapshot */}
        <div className="pt-2">
          <h4 className="font-bold text-xs uppercase tracking-wider text-gray-500 mb-2 flex items-center gap-1.5">
            <LuCrown className="w-4 h-4 text-amber-500" />
            Current Standings:
          </h4>
          <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
            {getSortedPlayers().map((player: any, index: number) => {
              const avatar = getAvatarColor(player.username);
              return (
                <div
                  key={player.userId}
                  className={`flex justify-between items-center p-2 px-3 rounded-xl text-xs sm:text-sm font-semibold ${
                    index === 0
                      ? "bg-amber-100/70 text-amber-950 border border-amber-300"
                      : "bg-gray-50 text-gray-800 border border-gray-100"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="w-5 text-center text-xs font-bold text-gray-500">
                      {index === 0 ? "👑" : `${index + 1}.`}
                    </span>
                    <div
                      className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold ${avatar.bg} ${avatar.text}`}
                    >
                      {getInitials(player.username)}
                    </div>
                    <span>{player.username}</span>
                  </div>
                  <span className="font-extrabold text-indigo-900">
                    {player.score} pts
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default RoundResultModal;
