import { useState, useRef } from "react";
import { useParams } from "react-router-dom";
import { Slider, Button, Progress, Drawer } from "antd";
import Navbar from "../../components/play/navbar";
import PlayerList from "../../components/play/playerList";
import WordSelectModal from "../../components/play/modals/wordSelectModal";
import RoundResultModal from "../../components/play/modals/roundResultModal";
import GameEndModal from "../../components/play/modals/gameEndModal";
import ChatSection from "../../components/play/chatSection";
import VideoCall from "../../components/play/VideoCall";
import DrawingTools from "../../components/play/drawingtools";
import { useCanvasDrawing } from "../../hooks/useCanvasDrawing";
import { useGameSocket } from "../../hooks/useGameSocket";
import {
  LuEraser,
  LuPalette,
  LuClock,
  LuTrash2,
  LuPencil,
  LuUsers,
  LuVideo,
  LuPaintBucket,
  LuUndo2,
  LuHourglass,
} from "react-icons/lu";

const PALETTE = [
  { name: "Black", value: "#000000" },
  { name: "White", value: "#ffffff" },
  { name: "Red", value: "#ef4444" },
  { name: "Blue", value: "#3b82f6" },
  { name: "Green", value: "#10b981" },
  { name: "Yellow", value: "#f59e0b" },
  { name: "Orange", value: "#f97316" },
  { name: "Purple", value: "#8b5cf6" },
  { name: "Pink", value: "#ec4899" },
  { name: "Brown", value: "#78350f" },
  { name: "Gray", value: "#6b7280" },
  { name: "Cyan", value: "#06b6d4" },
];

const Page = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState<boolean>(false);
  const [mobileDrawerTab, setMobileDrawerTab] = useState<"players" | "video">("players");
  const desktopChatRef = useRef<HTMLDivElement | null>(null);
  const mobileChatRef = useRef<HTMLDivElement | null>(null);

  // Modular custom socket & game state hook
  const {
    socket,
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
    roundResults,
    gameResults,
    preparationCountdown,
    showPreparation,
    currentTurn,
    totalTurnsInRound,
    gameState,
    activeModal,
    closeAllModals,
    toggleReady,
    selectWord,
  } = useGameSocket({ roomId });

  // Modular canvas drawing hook
  const {
    canvasRef,
    currentColor,
    currentStroke,
    toolMode,
    isErasing,
    setToolMode,
    handleColorChange,
    handleStrokeChange,
    clearCanvas,
    handleUndo,
    startDrawing,
    stopDrawing,
    draw,
  } = useCanvasDrawing({
    socket,
    roomId,
    isCurrentDrawer,
  });

  const isTimerCritical = timeLeft > 0 && timeLeft < 20000;

  return (
    <div className="min-h-screen lg:h-screen lg:max-h-screen lg:overflow-hidden bg-gradient-to-br from-indigo-50/40 via-purple-50/30 to-amber-50/40 flex flex-col">
      <Navbar socket={socket} />

      {/* Main Page Layout */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row max-w-7xl w-full mx-auto p-2 sm:p-3 md:p-4 gap-3 md:gap-4 overflow-y-auto lg:overflow-hidden">
        {/* LEFT / MAIN GAME AREA */}
        <div className="flex-1 flex flex-col space-y-2.5 sm:space-y-3 min-h-0">
          {/* Game Header Banner */}
          <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-sm border border-purple-100 p-3 sm:p-4 transition-colors">
            <div className="flex flex-wrap items-center justify-between gap-2">
              {/* Game Stage & Turn Pill */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-extrabold text-sm sm:text-base text-gray-900 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-500 animate-pulse" />
                  {gameState.state === "waiting" && "Lobby • Waiting for Players"}
                  {gameState.state === "playing" &&
                    gameState.round > 0 &&
                    `Round ${gameState.round}/${gameState.totalRounds} • Turn ${currentTurn}/${totalTurnsInRound}`}
                  {gameState.state === "playing" &&
                    gameState.round === 0 &&
                    "Game Starting..."}
                  {gameState.state === "ended" && "Game Ended"}
                </span>

                {/* Mobile Drawer Trigger Pills */}
                <div className="flex items-center gap-1 lg:hidden">
                  <button
                    type="button"
                    onClick={() => {
                      setMobileDrawerTab("players");
                      setMobileDrawerOpen(true);
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-purple-50 text-purple-700 hover:bg-purple-100 font-bold text-xs border border-purple-200 transition-colors"
                  >
                    <LuUsers className="w-3.5 h-3.5" />
                    <span>Players ({players.length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setMobileDrawerTab("video");
                      setMobileDrawerOpen(true);
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-bold text-xs border border-indigo-200 transition-colors"
                  >
                    <LuVideo className="w-3.5 h-3.5" />
                    <span>Call</span>
                  </button>
                </div>
              </div>

              {/* Timer Pill */}
              {gameState.state === "playing" && timeLeft > 0 && (
                <div
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-xl font-mono font-black text-sm sm:text-base shadow-xs transition-colors ${
                    isTimerCritical
                      ? "bg-rose-50 text-rose-600 border border-rose-300 animate-pulse-border"
                      : "bg-indigo-50 text-indigo-700 border border-indigo-200"
                  }`}
                >
                  <LuClock className={`w-4 h-4 ${isTimerCritical ? "text-rose-600 animate-spin" : ""}`} />
                  <span>{formatTime(timeLeft)}</span>
                </div>
              )}
            </div>

            {/* Word Hint / Drawer Status Row */}
            {gameState.state === "playing" && !showPreparation && (
              <div className="mt-2.5 pt-2 border-t border-gray-100 flex items-center justify-center">
                {isCurrentDrawer ? (
                  <div className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-100 to-pink-100 border border-purple-300 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold text-purple-900 shadow-2xs">
                    <LuPalette className="w-4 h-4 text-purple-700" />
                    <span>
                      Your Turn to Draw:{" "}
                      <span className="font-extrabold uppercase tracking-wide text-purple-950 underline">
                        {currentWord || "..."}
                      </span>
                    </span>
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-200 px-4 py-1.5 rounded-xl text-xs sm:text-sm text-blue-900 shadow-2xs">
                    <span className="font-medium text-blue-700">Word to guess:</span>
                    <span className="font-mono text-base sm:text-lg font-black tracking-widest text-indigo-950 bg-white px-3 py-0.5 rounded-lg border border-blue-200 shadow-2xs">
                      {wordHint || "_ _ _"}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Progress Bar */}
            {gameState.state === "playing" && timeLeft > 0 && (
              <Progress
                percent={(timeLeft / 80000) * 100}
                showInfo={false}
                strokeColor={isTimerCritical ? "#f43f5e" : "#6366f1"}
                trailColor="#e2e8f0"
                className="!mt-2 !mb-0"
                strokeWidth={5}
              />
            )}
          </div>

          {/* Preparation / Word Selection Banner */}
          {showPreparation && (
            <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-green-50 border border-emerald-200 shadow-sm rounded-2xl p-3 sm:p-4 text-center">
              <h3 className="text-sm sm:text-base font-extrabold text-emerald-900 flex items-center justify-center gap-1.5">
                <LuHourglass className="w-4 h-4 text-emerald-600 animate-spin" />
                {isCurrentDrawer ? "Choose Your Word!" : "Drawer Selecting Word..."}
              </h3>
              <p className="text-xs text-emerald-700 mt-0.5">
                {isCurrentDrawer
                  ? "Select one of the three options in the popup to start sketching"
                  : `${gameState.currentDrawer} is choosing what to draw for the room`}
              </p>
              <div className="text-lg sm:text-xl font-black text-emerald-900 mt-1">
                {preparationCountdown > 0 ? `${preparationCountdown}s remaining` : "Get ready..."}
              </div>
            </div>
          )}

          {/* Canvas & Desktop Drawing Tools Container */}
          <div className="flex-1 flex flex-col lg:flex-row gap-2.5 sm:gap-3 min-h-0 items-center justify-center">
            {/* HTML5 Canvas Board */}
            <div className="w-full flex-1 bg-white rounded-2xl sm:rounded-3xl shadow-md border border-purple-100 p-2 sm:p-3 flex items-center justify-center relative min-h-0 overflow-hidden">
              <canvas
                ref={canvasRef}
                onMouseDown={startDrawing}
                onMouseUp={stopDrawing}
                onMouseMove={draw}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchEnd={stopDrawing}
                onTouchMove={draw}
                className={`max-w-full max-h-full aspect-[4/3] border-2 border-slate-200 rounded-xl sm:rounded-2xl shadow-inner bg-white object-contain ${
                  isCurrentDrawer
                    ? toolMode === "eraser"
                      ? "cursor-crosshair"
                      : "cursor-crosshair"
                    : "cursor-not-allowed"
                } ${!isCurrentDrawer ? "pointer-events-none" : ""}`}
                style={{ touchAction: "none" }}
              />

              {/* Guesser watermark banner when not drawing */}
              {!isCurrentDrawer && gameState.state === "playing" && (
                <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-xs px-2.5 py-1 rounded-xl border border-gray-200 text-[11px] font-semibold text-gray-600 shadow-2xs pointer-events-none">
                  👀 Watching {gameState.currentDrawer} draw
                </div>
              )}
            </div>

            {/* Desktop Drawing Tools */}
            {isCurrentDrawer && (
              <div className="hidden lg:flex flex-col shrink-0">
                <DrawingTools
                  currentColor={currentColor}
                  currentStroke={currentStroke}
                  toolMode={toolMode}
                  setToolMode={setToolMode}
                  handleColorChange={handleColorChange}
                  handleStrokeChange={handleStrokeChange}
                  clearCanvas={clearCanvas}
                  undo={handleUndo}
                />
              </div>
            )}
          </div>

          {/* Mobile Drawing Tools Toolbar (Only shown to drawer on mobile screens) */}
          {isCurrentDrawer && (
            <div className="lg:hidden bg-white/95 backdrop-blur-md rounded-2xl shadow-sm border border-purple-100 p-2.5 flex flex-col gap-2 shrink-0">
              <div className="flex items-center justify-between gap-1.5 flex-wrap">
                {/* Tool buttons */}
                <div className="flex gap-1 shrink-0">
                  <Button
                    type={toolMode === "brush" ? "primary" : "default"}
                    size="middle"
                    icon={<LuPencil />}
                    onClick={() => setToolMode("brush")}
                    className="!px-2.5 !rounded-xl"
                  />
                  <Button
                    type={toolMode === "fill" ? "primary" : "default"}
                    size="middle"
                    icon={<LuPaintBucket />}
                    onClick={() => setToolMode("fill")}
                    className="!px-2.5 !rounded-xl"
                  />
                  <Button
                    type={toolMode === "eraser" ? "primary" : "default"}
                    size="middle"
                    icon={<LuEraser />}
                    onClick={() => setToolMode("eraser")}
                    className="!px-2.5 !rounded-xl"
                  />
                  <Button
                    type="default"
                    size="middle"
                    icon={<LuUndo2 />}
                    onClick={handleUndo}
                    className="!px-2.5 !rounded-xl !bg-amber-50 !text-amber-800 !border-amber-200"
                  />
                  <Button
                    type="default"
                    danger
                    size="middle"
                    icon={<LuTrash2 />}
                    onClick={clearCanvas}
                    className="!px-2.5 !rounded-xl"
                  />
                </div>

                {/* Stroke slider */}
                <div className="flex items-center gap-1.5 flex-1 max-w-[130px]">
                  <Slider
                    min={2}
                    max={24}
                    step={2}
                    value={currentStroke}
                    onChange={handleStrokeChange}
                    className="flex-1 !my-0"
                  />
                  <span className="text-[10px] font-bold text-gray-500 w-6 shrink-0">
                    {currentStroke}px
                  </span>
                </div>
              </div>

              {/* Color swatches */}
              <div className="flex gap-2 overflow-x-auto py-1 px-0.5">
                {PALETTE.map((color) => {
                  const isSelected = currentColor === color.value && !isErasing;
                  return (
                    <button
                      key={color.value}
                      onClick={() => handleColorChange(color.value)}
                      className={`w-7 h-7 rounded-full shadow-2xs border-2 shrink-0 transition-transform ${
                        isSelected
                          ? "border-purple-600 scale-115 ring-2 ring-purple-300"
                          : "border-gray-200 hover:scale-105"
                      }`}
                      style={{ backgroundColor: color.value }}
                      type="button"
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* MOBILE CHAT & GUESS INPUT BAR (DIRECTLY ON MAIN SCREEN!) */}
          <div className="lg:hidden w-full shrink-0">
            <ChatSection
              messages={messages}
              setMessage={setMessage}
              message={message}
              sendMessage={sendMessage}
              chatRef={mobileChatRef}
              handleKeyPress={handleKeyPress}
              socket={socket}
              isMobile={true}
              isCurrentDrawer={isCurrentDrawer}
            />
          </div>
        </div>

        {/* RIGHT SIDEBAR (Desktop: Player List, Video Call, Full Chat) */}
        <div className="hidden lg:flex flex-col w-80 xl:w-96 gap-3 shrink-0 min-h-0 overflow-y-auto [scrollbar-gutter:stable]">
          {/* Player List */}
          <PlayerList
            players={players}
            gameState={gameState}
            isReady={isReady}
            toggleReady={toggleReady}
            canStart={canStart}
          />

          {/* Video Call */}
          <VideoCall socket={socket} players={players} selfId={socket?.id} />

          {/* Desktop Full Chat */}
          <div className="flex-1 min-h-0">
            <ChatSection
              messages={messages}
              setMessage={setMessage}
              message={message}
              sendMessage={sendMessage}
              chatRef={desktopChatRef}
              handleKeyPress={handleKeyPress}
              socket={socket}
              isMobile={false}
              isCurrentDrawer={isCurrentDrawer}
            />
          </div>
        </div>
      </div>

      {/* MOBILE PLAYERS & VIDEO BOTTOM DRAWER */}
      <Drawer
        title={
          <div className="flex items-center justify-between w-full pr-6">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setMobileDrawerTab("players")}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs sm:text-sm transition-colors ${
                  mobileDrawerTab === "players"
                    ? "bg-purple-100 text-purple-800"
                    : "text-gray-500 hover:text-gray-800"
                }`}
              >
                👥 Players ({players.length})
              </button>
              <button
                type="button"
                onClick={() => setMobileDrawerTab("video")}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs sm:text-sm transition-colors ${
                  mobileDrawerTab === "video"
                    ? "bg-indigo-100 text-indigo-800"
                    : "text-gray-500 hover:text-gray-800"
                }`}
              >
                📹 Video Call
              </button>
            </div>
          </div>
        }
        placement="bottom"
        onClose={() => setMobileDrawerOpen(false)}
        open={mobileDrawerOpen}
        height="80%"
        className="rounded-t-3xl"
        styles={{ body: { padding: "12px 16px" } }}
      >
        <div className="space-y-4">
          {mobileDrawerTab === "players" ? (
            <PlayerList
              players={players}
              gameState={gameState}
              isReady={isReady}
              toggleReady={toggleReady}
              canStart={canStart}
            />
          ) : (
            <VideoCall socket={socket} players={players} selfId={socket?.id} />
          )}
        </div>
      </Drawer>

      {/* Modals */}
      <WordSelectModal
        showWordModal={activeModal === "wordSelect"}
        wordChoices={wordChoices}
        selectWord={selectWord}
      />

      <RoundResultModal
        showResultsModal={activeModal === "roundResult"}
        setShowResultsModal={() => closeAllModals()}
        roundResults={roundResults}
        players={players}
        gameState={gameState}
      />

      <GameEndModal
        showGameEndModal={activeModal === "gameEnd"}
        setShowGameEndModal={() => closeAllModals()}
        gameResults={gameResults}
      />
    </div>
  );
};

export default Page;
