import { Modal } from "antd";
import { LuSparkles, LuPalette } from "react-icons/lu";

interface WordSelectModalProps {
  showWordModal: boolean;
  wordChoices: string[];
  selectWord: (word: string) => void;
}

const WORD_GRADIENTS = [
  "from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700",
  "from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700",
  "from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700",
];

const WordSelectModal = ({
  showWordModal,
  wordChoices,
  selectWord,
}: WordSelectModalProps) => {
  return (
    <Modal
      open={showWordModal}
      footer={null}
      closable={false}
      maskClosable={false}
      centered
      width={440}
      className="lovely-modal"
    >
      <div className="py-2 text-center">
        {/* Playful Header */}
        <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-gradient-to-tr from-purple-500 to-indigo-600 text-white flex items-center justify-center shadow-lg animate-bounce">
          <LuPalette className="w-7 h-7" />
        </div>

        <h3 className="text-xl sm:text-2xl font-extrabold text-gray-900 tracking-tight">
          It's Your Turn to Draw!
        </h3>
        <p className="text-xs sm:text-sm text-gray-500 mt-1 mb-6">
          Pick a secret word to sketch for everyone:
        </p>

        {/* 3 Playful Word Choice Buttons */}
        <div className="space-y-3">
          {wordChoices.map((word: string, index: number) => {
            const gradient = WORD_GRADIENTS[index % WORD_GRADIENTS.length];
            return (
              <button
                key={index}
                type="button"
                onClick={() => selectWord(word)}
                className={`w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r ${gradient} text-white font-bold text-base sm:text-lg shadow-md hover:shadow-xl hover:scale-102 active:scale-98 transition-all flex items-center justify-between group cursor-pointer`}
              >
                <span className="capitalize tracking-wide">{word}</span>
                <span className="w-7 h-7 rounded-xl bg-white/20 group-hover:bg-white/30 flex items-center justify-center text-xs transition-colors">
                  <LuSparkles className="w-3.5 h-3.5 text-white" />
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </Modal>
  );
};

export default WordSelectModal;
