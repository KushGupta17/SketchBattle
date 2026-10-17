import { Button } from "antd";
import { LuMessageSquare, LuSend, LuSparkles, LuFlame, LuSmile } from "react-icons/lu";
import { useEffect } from "react";
import VoiceInput from "./voiceInput";
import { getAvatarColor, getInitials } from "../../utils/avatarUtils";

interface ChatSectionProps {
  messages: any[];
  setMessage: (msg: string) => void;
  message: string;
  sendMessage: () => void;
  chatRef: any;
  handleKeyPress: (e: any) => void;
  socket: any;
  isMobile?: boolean;
  isCurrentDrawer?: boolean;
}

const ChatSection = ({
  messages,
  setMessage,
  message,
  sendMessage,
  chatRef,
  handleKeyPress,
  socket,
  isMobile = false,
  isCurrentDrawer = false,
}: ChatSectionProps) => {
  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages]);

  const handleTranscriptUpdate = (transcript: string) => {
    setMessage(transcript);
  };

  return (
    <div
      className={`bg-white/95 backdrop-blur-md rounded-2xl shadow-md border border-purple-100 flex flex-col transition-colors duration-150 ${
        isMobile
          ? "p-2.5 sm:p-3 w-full"
          : "p-4 h-full min-h-[260px] flex-1"
      }`}
    >
      {/* Header (Desktop or if not compact) */}
      {!isMobile && (
        <div className="flex items-center justify-between pb-3 mb-2 border-b border-gray-100">
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <LuMessageSquare className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-gray-800 text-sm sm:text-base">
              Live Chat & Guesses
            </h3>
          </div>
          <div className="flex items-center space-x-1.5 px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 text-xs font-semibold">
            <LuSmile className="w-3.5 h-3.5" />
            <span>{messages.length}</span>
          </div>
        </div>
      )}

      {/* Messages Feed */}
      <div
        ref={chatRef}
        className={`flex-1 min-h-0 overflow-y-auto space-y-2 p-2.5 bg-gradient-to-b from-slate-50/80 to-white rounded-xl border border-slate-100 scroll-smooth [scrollbar-gutter:stable] ${
          isMobile
            ? "max-h-28 sm:max-h-36 mb-2 text-xs"
            : "mb-3 min-h-[140px] max-h-64 text-sm"
        }`}
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-4 text-gray-400 text-center">
            <LuSparkles className="w-5 h-5 text-amber-400 mb-1" />
            <p className="text-xs font-medium">
              No guesses yet. Be the first to guess!
            </p>
          </div>
        ) : (
          messages.map((msg: any, index: number) => {
            const isSystem = msg.username === "System";
            const isClose =
              isSystem &&
              typeof msg.message === "string" &&
              msg.message.includes("very close");
            const avatar = getAvatarColor(msg.username);

            if (isClose) {
              return (
                <div
                  key={index}
                  className="flex items-center gap-1.5 p-2 rounded-xl bg-gradient-to-r from-amber-100/90 to-orange-100/90 border border-amber-300 text-amber-900 shadow-xs animate-pulse-border"
                >
                  <LuFlame className="w-4 h-4 text-orange-600 shrink-0" />
                  <span className="font-bold text-xs sm:text-sm">
                    {msg.message}
                  </span>
                </div>
              );
            }

            if (isSystem) {
              return (
                <div
                  key={index}
                  className="flex items-center gap-1.5 p-1.5 px-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm"
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                  <span className="font-medium">{msg.message}</span>
                </div>
              );
            }

            return (
              <div
                key={index}
                className="flex items-start gap-2 p-1.5 rounded-lg hover:bg-gray-50/80 transition-colors"
              >
                {/* Cute Avatar Badge */}
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${avatar.bg} ${avatar.text}`}
                >
                  {getInitials(msg.username)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-bold text-gray-800 text-xs sm:text-sm">
                      {msg.username}
                    </span>
                    {msg.isGuessedOnly && (
                      <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100/80 px-1.5 py-0.2 rounded-full">
                        Guessed
                      </span>
                    )}
                  </div>
                  <p className="text-gray-700 text-xs sm:text-sm break-words mt-0.5">
                    {msg.message}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Chat Input Bar */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyPress}
          placeholder={
            isCurrentDrawer
              ? "You're drawing! Chat with players..."
              : "Type your answer or guess here..."
          }
          className="flex-1 px-3.5 py-2 sm:py-2.5 bg-gray-50/90 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:bg-white text-xs sm:text-sm text-gray-800 placeholder-gray-400 transition-all shadow-inner"
          maxLength={100}
          disabled={!socket}
        />

        {/* Voice Input */}
        <VoiceInput
          onTranscriptUpdate={handleTranscriptUpdate}
          disabled={!socket}
          className="shrink-0"
        />

        {/* Send Button */}
        <Button
          type="primary"
          icon={<LuSend className="w-4 h-4" />}
          onClick={sendMessage}
          disabled={!message.trim() || !socket}
          className="!h-9 sm:!h-10 !px-3.5 sm:!px-4 !rounded-xl !bg-gradient-to-r !from-indigo-600 !to-purple-600 hover:!from-indigo-500 hover:!to-purple-500 !border-0 shadow-md hover:shadow-lg hover:scale-105 active:scale-95 transition-all duration-150 flex items-center justify-center shrink-0"
        />
      </div>
    </div>
  );
};

export default ChatSection;
