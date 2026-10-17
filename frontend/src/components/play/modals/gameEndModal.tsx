import { Modal, Button, notification } from "antd";
import { LuTrophy, LuSparkles } from "react-icons/lu";
import { getAvatarColor, getInitials } from "../../../utils/avatarUtils";

interface GameEndModalProps {
  showGameEndModal: boolean;
  setShowGameEndModal: (open: boolean) => void;
  gameResults: any;
}

const GameEndModal = ({
  showGameEndModal,
  setShowGameEndModal,
  gameResults,
}: GameEndModalProps) => {
  if (!gameResults) return null;

  const rankings = gameResults.rankings || [];
  const winner = rankings[0];

  return (
    <Modal
      title={null}
      open={showGameEndModal}
      footer={
        <Button
          type="primary"
          onClick={() => {
            notification.success({
              message: "Game Restarted! 🎉",
              description: "The room is ready for another round of SketchBattle!",
              duration: 5,
            });
            setShowGameEndModal(false);
          }}
          size="large"
          className="w-full !h-12 !rounded-2xl !bg-gradient-to-r !from-indigo-600 via-purple-600 to-pink-600 hover:!from-indigo-500 hover:!to-pink-500 !border-0 !text-base !font-bold shadow-xl hover:scale-101 active:scale-99 transition-all"
        >
          Play Another Match 🎮
        </Button>
      }
      closable={false}
      maskClosable={false}
      centered
      width={480}
    >
      <div className="py-2 space-y-4 text-center">
        {/* Winner Trophy Hero */}
        <div className="relative inline-block mx-auto">
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-amber-400 via-yellow-400 to-amber-500 text-amber-950 flex items-center justify-center shadow-xl mx-auto animate-bounce">
            <LuTrophy className="w-9 h-9" />
          </div>
          <div className="absolute -top-2 -right-2 text-yellow-500">
            <LuSparkles className="w-5 h-5 animate-spin" />
          </div>
        </div>

        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
            Game Over!
          </h2>
          {winner && (
            <p className="text-sm font-semibold text-purple-700 mt-1">
              🏆 Huge congratulations to{" "}
              <span className="font-extrabold underline">{winner.username}</span> for winning!
            </p>
          )}
        </div>

        {/* Podium Standings */}
        <div className="space-y-2 pt-2 text-left">
          {rankings.map((player: any, index: number) => {
            const avatar = getAvatarColor(player.username);
            const isWinner = index === 0;
            const isRunnerUp = index === 1;
            const isThird = index === 2;

            return (
              <div
                key={index}
                className={`flex justify-between items-center p-3 rounded-2xl transition-all ${
                  isWinner
                    ? "bg-gradient-to-r from-amber-100 via-yellow-100 to-amber-200 border-2 border-amber-400 shadow-md scale-102"
                    : isRunnerUp
                    ? "bg-slate-100 border border-slate-300"
                    : isThird
                    ? "bg-amber-50/70 border border-amber-200"
                    : "bg-gray-50 border border-gray-100"
                }`}
              >
                <div className="flex items-center space-x-3">
                  <span className="w-7 text-center font-black text-base sm:text-lg">
                    {isWinner ? "🥇" : isRunnerUp ? "🥈" : isThird ? "🥉" : `#${index + 1}`}
                  </span>
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${avatar.bg} ${avatar.text}`}
                  >
                    {getInitials(player.username)}
                  </div>
                  <div>
                    <span className="font-bold text-sm sm:text-base text-gray-900">
                      {player.username}
                    </span>
                    {isWinner && (
                      <span className="ml-2 text-[10px] font-bold uppercase tracking-wider bg-amber-300 text-amber-950 px-2 py-0.5 rounded-full">
                        Winner
                      </span>
                    )}
                  </div>
                </div>

                <div className="font-black text-base sm:text-lg text-indigo-950">
                  {player.score} <span className="text-xs font-semibold text-gray-500">pts</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Modal>
  );
};

export default GameEndModal;
