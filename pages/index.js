import { useRef, useEffect, useState } from "react";

const BOARD_SIZE = 1000;
const INIT_ZOOM = 1;
const MIN_ZOOM = 1;
const MAX_ZOOM = 20;
const CANVAS_VIEWPORT = 500;

const COLORS = [
  "#FFFFFF", "#000000", "#FF0000", "#00FF00", "#0000FF",
  "#FFFF00", "#FF00FF", "#00FFFF", "#FFA500", "#800080",
  "#008000", "#C0C0C0", "#A52A2A", "#FFD700", "#ADFF2F"
];

export default function Home() {
  const canvasRef = useRef(null);
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);
  const [cooldown, setCooldown] = useState(0);
  const [loading, setLoading] = useState(true);
  const [board, setBoard] = useState([]);
  const [zoom, setZoom] = useState(INIT_ZOOM);
  const [message, setMessage] = useState("");
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [view, setView] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragOrigin, setDragOrigin] = useState({ x: 0, y: 0 });
  const [dragViewOrigin, setDragViewOrigin] = useState({ x: 0, y: 0 });

  // 拉取画布数据
  const fetchBoard = () => {
    setLoading(true);
    fetch("/api/board")
      .then(res => res.json())
      .then(data => {
        setBoard(data.board);
        setCooldown(data.cooldown);
        setLoading(false);
        setMessage("");
      });
  };

  useEffect(() => {
    fetchBoard();
    const interval = setInterval(fetchBoard, 30000);
    return () => clearInterval(interval);
  }, []);

  // 渲染 Canvas（只绘制当前视角区域）
  useEffect(() => {
    if (!board.length || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d");
    ctx.clearRect(0, 0, CANVAS_VIEWPORT, CANVAS_VIEWPORT);
    const pixelSize = zoom;
    const { x: startX, y: startY } = view;
    for (let y = 0; y < CANVAS_VIEWPORT / pixelSize; y++) {
      for (let x = 0; x < CANVAS_VIEWPORT / pixelSize; x++) {
        const boardX = startX + x;
        const boardY = startY + y;
        if (
          boardX >= 0 && boardX < BOARD_SIZE &&
          boardY >= 0 && boardY < BOARD_SIZE
        ) {
          const color = board[boardY][boardX] ? board[boardY][boardX] : "#FFFFFF";
          ctx.fillStyle = color;
        } else {
          ctx.fillStyle = "#eee";
        }
        ctx.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
      }
    }
    // 网格线
    if (zoom >= 8) {
      ctx.strokeStyle = "rgba(120,120,120,0.12)";
      ctx.lineWidth = 1;
      for (let x = 0; x <= CANVAS_VIEWPORT; x += pixelSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, CANVAS_VIEWPORT);
        ctx.stroke();
      }
      for (let y = 0; y <= CANVAS_VIEWPORT; y += pixelSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(CANVAS_VIEWPORT, y);
        ctx.stroke();
      }
    }
  }, [board, view, zoom]);

  // 点色（点击当前视角内的像素）
  const handleCanvasClick = (e) => {
    if (loading || dragging) return;
    if (cooldown > 0) {
      setMessage(`冷却中，请等待 ${cooldown} 秒`);
      return;
    }
    const rect = canvasRef.current.getBoundingClientRect();
    const scale = rect.width / CANVAS_VIEWPORT;
    const xInCanvas = (e.clientX - rect.left) / scale;
    const yInCanvas = (e.clientY - rect.top) / scale;
    const pixelSize = zoom;
    let px = Math.floor(xInCanvas / pixelSize);
    let py = Math.floor(yInCanvas / pixelSize);
    let boardX = view.x + px;
    let boardY = view.y + py;
    boardX = Math.max(0, Math.min(BOARD_SIZE - 1, boardX));
    boardY = Math.max(0, Math.min(BOARD_SIZE - 1, boardY));
    fetch("/api/paint", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ x: boardX, y: boardY, color: selectedColor }),
    })
      .then(res => res.json())
      .then(data => {
        setBoard(data.board);
        setCooldown(data.cooldown);
        setMessage(data.cooldown > 0 ? `冷却中：${data.cooldown}秒` : "");
      });
  };

  // 拖动画布
  const handleMouseDown = (e) => {
    setDragging(true);
    setDragOrigin({ x: e.clientX, y: e.clientY });
    setDragViewOrigin({ ...view });
  };
  const handleMouseUp = () => {
    setDragging(false);
  };
  const handleMouseMove = (e) => {
    if (!dragging) return;
    const dx = Math.round((e.clientX - dragOrigin.x) / zoom);
    const dy = Math.round((e.clientY - dragOrigin.y) / zoom);
    let newX = dragViewOrigin.x - dx;
    let newY = dragViewOrigin.y - dy;
    newX = Math.max(0, Math.min(BOARD_SIZE - Math.floor(CANVAS_VIEWPORT / zoom), newX));
    newY = Math.max(0, Math.min(BOARD_SIZE - Math.floor(CANVAS_VIEWPORT / zoom), newY));
    setView({ x: newX, y: newY });
  };

  // 适应缩放后视角（保持中心不变）
  useEffect(() => {
    const oldViewSize = Math.floor(CANVAS_VIEWPORT / (zoom > 1 ? zoom - 1 : zoom));
    const newViewSize = Math.floor(CANVAS_VIEWPORT / zoom);
    let centerX = view.x + oldViewSize / 2;
    let centerY = view.y + oldViewSize / 2;
    let newX = Math.round(centerX - newViewSize / 2);
    let newY = Math.round(centerY - newViewSize / 2);
    newX = Math.max(0, Math.min(BOARD_SIZE - newViewSize, newX));
    newY = Math.max(0, Math.min(BOARD_SIZE - newViewSize, newY));
    setView({ x: newX, y: newY });
    // eslint-disable-next-line
  }, [zoom]);

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setInterval(() => {
        setCooldown(c => Math.max(0, c - 1));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [cooldown]);

  // 触摸拖动（移动端）
  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
      setDragging(true);
      setDragOrigin({ x: e.touches[0].clientX, y: e.touches[0].clientY });
      setDragViewOrigin({ ...view });
    }
  };
  const handleTouchMove = (e) => {
    if (!dragging || e.touches.length !== 1) return;
    const dx = Math.round((e.touches[0].clientX - dragOrigin.x) / zoom);
    const dy = Math.round((e.touches[0].clientY - dragOrigin.y) / zoom);
    let newX = dragViewOrigin.x - dx;
    let newY = dragViewOrigin.y - dy;
    newX = Math.max(0, Math.min(BOARD_SIZE - Math.floor(CANVAS_VIEWPORT / zoom), newX));
    newY = Math.max(0, Math.min(BOARD_SIZE - Math.floor(CANVAS_VIEWPORT / zoom), newY));
    setView({ x: newX, y: newY });
  };
  const handleTouchEnd = () => {
    setDragging(false);
  };

  // 悬浮调色板
  const paletteBtnSize = 54;

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(120deg, #f1f3f9 0%, #e0edff 100%)",
      fontFamily: "system-ui,sans-serif",
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    }}>
      <div style={{
        width: CANVAS_VIEWPORT + 48,
        background: "rgba(255,255,255,0.85)",
        borderRadius: 24,
        boxShadow: "0 8px 32px 0 rgba(0,0,0,0.07)",
        padding: "40px 28px",
        position: "relative",
        backdropFilter: "blur(12px)"
      }}>
        <h2 style={{
          textAlign: "center",
          margin: 0,
          fontWeight: 700,
          fontSize: 28,
          letterSpacing: 1,
          color: "#2a2a2a",
          textShadow: "0 2px 16px #f2f2f2"
        }}>像素大战</h2>
        <div
          style={{
            marginBottom: 16,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: 24
          }}
        >
          <button
            onClick={fetchBoard}
            style={{
              padding: "8px 24px",
              borderRadius: 12,
              border: "none",
              background: "linear-gradient(90deg,#dbeafe 0%,#f3f4f6 100%)",
              fontWeight: 600,
              fontSize: 16,
              color: "#2a44bb",
              cursor: "pointer",
              boxShadow: "0 2px 12px #c4d3ff44",
              transition: "box-shadow .2s"
            }}
          >刷新画布</button>
          <div style={{
            fontSize: 16,
            color: "#444",
            minWidth: 120,
            textAlign: "center",
            fontWeight: 500,
            borderRadius: 8,
            background: "rgba(230,240,255,0.6)",
            padding: "6px 12px"
          }}>
            {cooldown > 0 ? `冷却：${cooldown}秒` : "可点色"}
          </div>
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 10
          }}>
            <span style={{ fontSize: 15, color: "#6e7ca0" }}>缩放</span>
            <input
              type="range"
              min={MIN_ZOOM}
              max={MAX_ZOOM}
              value={zoom}
              onChange={e => setZoom(Number(e.target.value))}
              style={{ width: 100 }}
            />
            <span style={{ fontSize: 15 }}>{zoom}x</span>
          </div>
        </div>
        <div style={{
          margin: "0 auto",
          border: "2px solid #b5c5ea",
          borderRadius: 18,
          boxShadow: "0 4px 24px #b5c5ea33",
          background: "rgba(245,248,255,0.94)",
          width: CANVAS_VIEWPORT,
          height: CANVAS_VIEWPORT,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          position: "relative"
        }}>
          <canvas
            ref={canvasRef}
            width={CANVAS_VIEWPORT}
            height={CANVAS_VIEWPORT}
            style={{
              width: CANVAS_VIEWPORT,
              height: CANVAS_VIEWPORT,
              cursor: dragging ? "grab" : (cooldown > 0 ? "not-allowed" : "crosshair"),
              borderRadius: 18,
              background: "#fff",
              display: loading ? "none" : "block",
              boxShadow: "0 6px 16px #b5c5ea11",
              transition: "box-shadow 0.16s"
            }}
            onClick={handleCanvasClick}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onMouseMove={handleMouseMove}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            onTouchMove={handleTouchMove}
          />
          {loading && (
            <div style={{
              width: CANVAS_VIEWPORT,
              height: CANVAS_VIEWPORT,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#aaa",
              fontSize: 20
            }}>加载中...</div>
          )}
          <div style={{
            position: "absolute",
            left: 14,
            bottom: 14,
            background: "rgba(255,255,255,0.9)",
            color: "#2a44bb",
            padding: "6px 14px",
            borderRadius: 8,
            fontSize: 15,
            boxShadow: "0 2px 8px #b5c5ea11",
            fontWeight: 600,
            opacity: 0.96
          }}>
            视角：({view.x}, {view.y}) | 区域：{Math.floor(CANVAS_VIEWPORT/zoom)}x{Math.floor(CANVAS_VIEWPORT/zoom)}
          </div>
        </div>
        {message && (
          <div style={{
            color: "#d00",
            marginTop: 26,
            textAlign: "center",
            fontWeight: 600,
            fontSize: 16,
            letterSpacing: 1
          }}>{message}</div>
        )}

        {/* 悬浮调色板 */}
        <div style={{
          position: "fixed",
          right: 38,
          bottom: 38,
          zIndex: 9999,
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end"
        }}>
          <div style={{
            transition: "all 0.35s cubic-bezier(.4,.7,.4,1.2)",
            opacity: paletteOpen ? 1 : 0,
            pointerEvents: paletteOpen ? "auto" : "none",
            transform: paletteOpen ? "translateY(0) scale(1)" : "translateY(20px) scale(0.85)",
            marginBottom: paletteOpen ? 20 : 0,
            boxShadow: "0 4px 32px #b5c5ea55",
            borderRadius: 20,
            background: "rgba(255,255,255,0.98)",
            padding: paletteOpen ? "22px 20px 10px 20px" : "0",
            display: paletteOpen ? "grid" : "none",
            gridTemplateColumns: "repeat(5, 36px)",
            gap: "14px"
          }}>
            {COLORS.map(c => (
              <button
                key={c}
                style={{
                  background: c,
                  width: 34, height: 34,
                  borderRadius: "50%",
                  border: selectedColor === c ? "3px solid #2a44bb" : "2px solid #e8e8ee",
                  cursor: "pointer",
                  outline: "none",
                  boxShadow: selectedColor === c ? "0 0 0 4px #b5c5ea55" : "",
                  transition: "border 0.16s"
                }}
                onClick={() => {
                  setSelectedColor(c);
                  setPaletteOpen(false);
                }}
                aria-label={c}
              />
            ))}
          </div>
          <button
            onClick={() => setPaletteOpen(!paletteOpen)}
            style={{
              width: paletteBtnSize,
              height: paletteBtnSize,
              borderRadius: "50%",
              border: "none",
              background: selectedColor,
              boxShadow: "0 6px 22px #b5c5ea33",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              transition: "background 0.3s"
            }}
            title="选择颜色"
          >
            <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
              <circle cx="16" cy="16" r="13" fill="white" opacity="0.65"/>
              <path d="M10 16a6 6 0 1 1 12 0c0 1-1 2-2 2h-8c-1 0-2-1-2-2z" fill="#444"/>
              <circle cx="16" cy="21" r="2" fill="#444"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

function hexToRgb(hex) {
  let h = hex.replace("#", "");
  if (h.length === 3) h = h.split("").map(x => x + x).join("");
  if (h === "") return [255, 255, 255];
  const num = parseInt(h, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}
