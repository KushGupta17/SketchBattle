import { Tooltip } from "antd";
import { BiMinus, BiPlus } from "react-icons/bi";
import {
  LuEraser,
  LuTrash2,
  LuPencil,
  LuPaintBucket,
  LuUndo2,
} from "react-icons/lu";

interface DrawingToolsProps {
  currentColor: string;
  currentStroke: number;
  toolMode: "brush" | "fill" | "eraser";
  setToolMode: (mode: "brush" | "fill" | "eraser") => void;
  handleColorChange: (color: string) => void;
  handleStrokeChange: (stroke: number) => void;
  clearCanvas: () => void;
  undo: () => void;
}

const PALETTE = [
  "#000000", // Black
  "#ffffff", // White
  "#ef4444", // Red
  "#3b82f6", // Blue
  "#10b981", // Green
  "#f59e0b", // Yellow
  "#f97316", // Orange
  "#8b5cf6", // Purple
  "#ec4899", // Pink
  "#78350f", // Brown
  "#6b7280", // Gray
  "#06b6d4", // Cyan
];

const DrawingTools = ({
  currentColor,
  currentStroke,
  toolMode,
  setToolMode,
  handleColorChange,
  handleStrokeChange,
  clearCanvas,
  undo,
}: DrawingToolsProps) => {
  const handleStrokePlus = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    handleStrokeChange(Math.min(currentStroke + 2, 24));
  };

  const handleStrokeMinus = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    handleStrokeChange(Math.max(currentStroke - 2, 2));
  };

  return (
    <div className="w-16 bg-white/95 backdrop-blur-md shadow-lg rounded-2xl p-2.5 flex flex-col items-center gap-3 border border-purple-100 transition-colors duration-150">
      {/* Tool Selector Buttons */}
      <div className="flex flex-col gap-1.5 w-full items-center">
        <Tooltip title="Brush Tool" placement="right">
          <button
            type="button"
            onClick={() => setToolMode("brush")}
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
              toolMode === "brush"
                ? "bg-gradient-to-tr from-indigo-600 to-blue-500 text-white shadow-md scale-105"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            <LuPencil className="w-4 h-4" />
          </button>
        </Tooltip>

        <Tooltip title="Paint Bucket (Flood Fill)" placement="right">
          <button
            type="button"
            onClick={() => setToolMode("fill")}
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
              toolMode === "fill"
                ? "bg-gradient-to-tr from-purple-600 to-pink-500 text-white shadow-md scale-105"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            <LuPaintBucket className="w-4 h-4" />
          </button>
        </Tooltip>

        <Tooltip title="Eraser Tool" placement="right">
          <button
            type="button"
            onClick={() => setToolMode("eraser")}
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
              toolMode === "eraser"
                ? "bg-gradient-to-tr from-rose-500 to-red-500 text-white shadow-md scale-105"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            <LuEraser className="w-4 h-4" />
          </button>
        </Tooltip>

        <Tooltip title="Undo Stroke (Ctrl+Z)" placement="right">
          <button
            type="button"
            onClick={undo}
            className="w-9 h-9 rounded-xl flex items-center justify-center bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 transition-all active:scale-95"
          >
            <LuUndo2 className="w-4 h-4" />
          </button>
        </Tooltip>

        <Tooltip title="Clear Canvas" placement="right">
          <button
            type="button"
            onClick={clearCanvas}
            className="w-9 h-9 rounded-xl flex items-center justify-center bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200 transition-all active:scale-95"
          >
            <LuTrash2 className="w-4 h-4" />
          </button>
        </Tooltip>
      </div>

      <div className="w-full h-px bg-purple-100" />

      {/* Color Palette Grid */}
      <div className="grid grid-cols-2 gap-1.5">
        {PALETTE.map((color) => {
          const isSelected = currentColor === color && toolMode !== "eraser";
          return (
            <button
              key={color}
              onClick={() => {
                handleColorChange(color);
                if (toolMode === "eraser") setToolMode("brush");
              }}
              className={`w-5 h-5 rounded-full border transition-all ${
                isSelected
                  ? "ring-2 ring-indigo-500 ring-offset-1 scale-110 border-white shadow-xs"
                  : "border-gray-200 hover:scale-110"
              }`}
              style={{ backgroundColor: color }}
              type="button"
            />
          );
        })}
      </div>

      <div className="w-full h-px bg-purple-100" />

      {/* Brush Size Adjustment */}
      <div className="flex flex-col items-center">
        <span className="text-[10px] font-bold text-gray-500 mb-1">
          {currentStroke}px
        </span>
        <div className="flex flex-col gap-1">
          <button
            type="button"
            onClick={handleStrokePlus}
            className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-indigo-50 hover:text-indigo-600 text-gray-700 flex items-center justify-center text-xs font-bold transition-colors"
          >
            <BiPlus />
          </button>
          <button
            type="button"
            onClick={handleStrokeMinus}
            className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-indigo-50 hover:text-indigo-600 text-gray-700 flex items-center justify-center text-xs font-bold transition-colors"
          >
            <BiMinus />
          </button>
        </div>
      </div>
    </div>
  );
};

export default DrawingTools;
