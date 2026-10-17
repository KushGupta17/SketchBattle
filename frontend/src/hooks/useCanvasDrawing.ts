import { useEffect, useRef, useState, useCallback } from "react";
import { DrawData } from "../types/types";
import { floodFill } from "../utils/floodFill";

interface UseCanvasDrawingProps {
  socket: any;
  roomId?: string;
  isCurrentDrawer: boolean;
}

export const useCanvasDrawing = ({
  socket,
  roomId,
  isCurrentDrawer,
}: UseCanvasDrawingProps) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const lastCoords = useRef<{ x: number | null; y: number | null }>({
    x: null,
    y: null,
  });

  const [currentColor, setCurrentColor] = useState<string>("#000000");
  const [currentStroke, setCurrentStroke] = useState<number>(4);
  const [toolMode, setToolMode] = useState<"brush" | "fill" | "eraser">("brush");
  const [isDrawing, setIsDrawing] = useState<boolean>(false);

  const currentStrokeId = useRef<string>("");

  const handleDrawEvent = useCallback((data: DrawData) => {
    const canvas = canvasRef.current;
    if (!ctxRef.current || !canvas) return;

    if (data.type === "fill") {
      floodFill(canvas, data.x, data.y, data.color);
      return;
    }

    ctxRef.current.strokeStyle = data.color;
    ctxRef.current.lineWidth = data.stroke;
    ctxRef.current.beginPath();
    ctxRef.current.moveTo(data.lastX || data.x, data.lastY || data.y);
    ctxRef.current.lineTo(data.x, data.y);
    ctxRef.current.stroke();
  }, []);

  // Canvas setup and real-time socket events
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !socket) return;

    const resizeCanvas = () => {
      canvas.width = 800;
      canvas.height = 600;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.lineWidth = currentStroke;
      ctx.strokeStyle = currentColor;
      ctxRef.current = ctx;

      // Restore session history
      const history = JSON.parse(
        sessionStorage.getItem(`canvas-${roomId}`) || "[]"
      );
      history.forEach((data: DrawData) => {
        handleDrawEvent(data);
      });
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    socket.on("draw", (data: DrawData) => {
      handleDrawEvent(data);
      const history = JSON.parse(
        sessionStorage.getItem(`canvas-${roomId}`) || "[]"
      );
      history.push(data);
      sessionStorage.setItem(`canvas-${roomId}`, JSON.stringify(history));
    });

    socket.on("canvasHistory", (history: DrawData[]) => {
      if (canvas && ctxRef.current) {
        ctxRef.current.clearRect(0, 0, canvas.width, canvas.height);
        history.forEach(handleDrawEvent);
        sessionStorage.setItem(`canvas-${roomId}`, JSON.stringify(history));
      }
    });

    socket.on("canvasClear", () => {
      if (canvas && ctxRef.current) {
        ctxRef.current.clearRect(0, 0, canvas.width, canvas.height);
        sessionStorage.removeItem(`canvas-${roomId}`);
      }
    });

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      socket.off("draw");
      socket.off("canvasHistory");
      socket.off("canvasClear");
    };
  }, [socket, roomId, currentColor, currentStroke, handleDrawEvent]);

  // Context style updates
  useEffect(() => {
    if (ctxRef.current) {
      ctxRef.current.strokeStyle = currentColor;
      ctxRef.current.lineWidth = currentStroke;
    }
  }, [currentColor, currentStroke]);

  // Keyboard shortcut Ctrl+Z / Cmd+Z for undo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z" && !e.shiftKey) {
        if (
          document.activeElement?.tagName === "INPUT" ||
          document.activeElement?.tagName === "TEXTAREA"
        ) {
          return;
        }
        if (isCurrentDrawer && socket) {
          e.preventDefault();
          socket.emit("undoDraw");
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isCurrentDrawer, socket]);

  const getCoordinates = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    if ("touches" in e) {
      const touch = e.touches[0] || e.changedTouches[0];
      return {
        x: (touch.clientX - rect.left) * scaleX,
        y: (touch.clientY - rect.top) * scaleY,
      };
    } else {
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
    }
  };

  const startDrawing = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    if (!isCurrentDrawer || !ctxRef.current || !socket || !roomId) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    e.preventDefault();
    const coords = getCoordinates(e);

    if (toolMode === "fill") {
      const fillColor = currentColor;
      floodFill(canvas, coords.x, coords.y, fillColor);

      const fillData: DrawData = {
        x: coords.x,
        y: coords.y,
        lastX: coords.x,
        lastY: coords.y,
        roomId,
        color: fillColor,
        stroke: 1,
        type: "fill",
        strokeId: `fill-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      };

      socket.emit("draw", fillData);
      return;
    }

    setIsDrawing(true);
    currentStrokeId.current = `stroke-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    lastCoords.current = coords;

    const color = toolMode === "eraser" ? "white" : currentColor;
    const stroke = toolMode === "eraser" ? 20 : currentStroke;

    const initialDrawData: DrawData = {
      x: coords.x,
      y: coords.y,
      lastX: coords.x,
      lastY: coords.y,
      roomId,
      color,
      stroke,
      type: "stroke",
      strokeId: currentStrokeId.current,
    };

    socket.emit("draw", initialDrawData);

    ctxRef.current.strokeStyle = color;
    ctxRef.current.lineWidth = stroke;
    ctxRef.current.beginPath();
    ctxRef.current.moveTo(coords.x, coords.y);
    ctxRef.current.lineTo(coords.x, coords.y);
    ctxRef.current.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    lastCoords.current = { x: null, y: null };
  };

  const draw = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    if (!isDrawing || !ctxRef.current || !socket || !roomId || !isCurrentDrawer)
      return;

    e.preventDefault();
    const coords = getCoordinates(e);
    const color = toolMode === "eraser" ? "white" : currentColor;
    const stroke = toolMode === "eraser" ? 20 : currentStroke;

    const drawData: DrawData = {
      x: coords.x,
      y: coords.y,
      lastX: lastCoords.current.x,
      lastY: lastCoords.current.y,
      roomId,
      color,
      stroke,
      type: "stroke",
      strokeId: currentStrokeId.current,
    };

    socket.emit("draw", drawData);

    ctxRef.current.strokeStyle = color;
    ctxRef.current.lineWidth = stroke;
    ctxRef.current.beginPath();
    ctxRef.current.moveTo(lastCoords.current.x!, lastCoords.current.y!);
    ctxRef.current.lineTo(coords.x, coords.y);
    ctxRef.current.stroke();

    lastCoords.current = coords;
  };

  const handleColorChange = (color: string) => {
    setCurrentColor(color);
    if (toolMode === "eraser") setToolMode("brush");
  };

  const handleStrokeChange = (stroke: number) => {
    setCurrentStroke(stroke);
  };

  const clearCanvas = () => {
    if (!socket || !isCurrentDrawer) return;
    socket.emit("clearCanvas");
  };

  const handleUndo = () => {
    if (!socket || !isCurrentDrawer) return;
    socket.emit("undoDraw");
  };

  return {
    canvasRef,
    currentColor,
    currentStroke,
    toolMode,
    isErasing: toolMode === "eraser",
    setToolMode,
    handleColorChange,
    handleStrokeChange,
    clearCanvas,
    handleUndo,
    startDrawing,
    stopDrawing,
    draw,
  };
};
