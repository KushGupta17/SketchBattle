/**
 * High-performance 4-way BFS flood fill algorithm on an HTML5 canvas.
 * Fills connected pixels matching the clicked area with the selected fill color.
 */
export function floodFill(
  canvas: HTMLCanvasElement,
  startX: number,
  startY: number,
  fillColor: string
) {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return;

  const width = canvas.width;
  const height = canvas.height;

  const x0 = Math.round(startX);
  const y0 = Math.round(startY);

  if (x0 < 0 || x0 >= width || y0 < 0 || y0 >= height) return;

  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;

  // Convert target color string to RGBA values using an offscreen canvas
  const helperCanvas = document.createElement("canvas");
  helperCanvas.width = 1;
  helperCanvas.height = 1;
  const helperCtx = helperCanvas.getContext("2d");
  if (!helperCtx) return;

  helperCtx.fillStyle = fillColor;
  helperCtx.fillRect(0, 0, 1, 1);
  const targetColor = helperCtx.getImageData(0, 0, 1, 1).data;
  const [fillR, fillG, fillB, fillA] = targetColor;

  const startIndex = (y0 * width + x0) * 4;
  const startR = data[startIndex];
  const startG = data[startIndex + 1];
  const startB = data[startIndex + 2];
  const startA = data[startIndex + 3];

  // Already the desired color
  if (startR === fillR && startG === fillG && startB === fillB && startA === fillA) {
    return;
  }

  const matchTolerance = (pos: number) => {
    return (
      Math.abs(data[pos] - startR) < 24 &&
      Math.abs(data[pos + 1] - startG) < 24 &&
      Math.abs(data[pos + 2] - startB) < 24 &&
      Math.abs(data[pos + 3] - startA) < 24
    );
  };

  const queue: Int32Array = new Int32Array(width * height * 2);
  let head = 0;
  let tail = 0;

  queue[tail++] = x0;
  queue[tail++] = y0;

  const visited = new Uint8Array(width * height);
  visited[y0 * width + x0] = 1;

  while (head < tail) {
    const x = queue[head++];
    const y = queue[head++];

    const pos = (y * width + x) * 4;
    data[pos] = fillR;
    data[pos + 1] = fillG;
    data[pos + 2] = fillB;
    data[pos + 3] = fillA;

    // Check neighboring pixels (East, West, South, North)
    if (x + 1 < width) {
      const idx = y * width + (x + 1);
      if (!visited[idx] && matchTolerance(idx * 4)) {
        visited[idx] = 1;
        queue[tail++] = x + 1;
        queue[tail++] = y;
      }
    }
    if (x - 1 >= 0) {
      const idx = y * width + (x - 1);
      if (!visited[idx] && matchTolerance(idx * 4)) {
        visited[idx] = 1;
        queue[tail++] = x - 1;
        queue[tail++] = y;
      }
    }
    if (y + 1 < height) {
      const idx = (y + 1) * width + x;
      if (!visited[idx] && matchTolerance(idx * 4)) {
        visited[idx] = 1;
        queue[tail++] = x;
        queue[tail++] = y + 1;
      }
    }
    if (y - 1 >= 0) {
      const idx = (y - 1) * width + x;
      if (!visited[idx] && matchTolerance(idx * 4)) {
        visited[idx] = 1;
        queue[tail++] = x;
        queue[tail++] = y - 1;
      }
    }
  }

  ctx.putImageData(imgData, 0, 0);
}
