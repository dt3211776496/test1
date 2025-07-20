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

  // 渲染 Canvas
  useEffect(() => {
    if (!board.length || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d");
    ctx.clearRect(0, 0, BOARD_SIZE, BOARD_SIZE);
    const imageData = ctx.createImageData(BOARD_SIZE, BOARD_SIZE);
    for (let y = 0; y < BOARD_SIZE; y++) {
      for (let x = 0; x < BOARD_SIZE; x++) {
        const color = board[y][x] ? board[y][x] : "#FFFFFF";
        const idx = (y * BOARD_SIZE + x) * 4;
        const rgb = hexToRgb(color);
        imageData.data[idx] = rgb[0];
        imageData.data[idx + 1] = rgb[1];
        imageData.data[idx + 2] = rgb[2];
        imageData.data[idx + 3] = 255;
      }
    }
    ctx.putImageData(imageData, 0, 0);
  }, [board]);

  // 画布点击
  const handleCanvasClick = (e) => {
    if (loading) return;
    if (cooldown > 0) {
      setMessage(`冷却中，请等待 ${cooldown} 秒`);
      return;
    }
    const rect = canvasRef.current.getBoundingClientRect();
    const scale = rect.width / BOARD_SIZE;
    let x = Math.floor((e.clientX - rect.left) / scale);
    let y = Math.floor((e.clientY - rect.top) / scale);
    x = Math.max(0, Math.min(BOARD_SIZE - 1, x));
    y = Math.max(0, Math.min(BOARD_SIZE - 1, y));
    fetch("/api/paint", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ x, y, color: selectedColor }),
    })
      .then(res => res.json())
      .then(data => {
        setBoard(data.board);
        setCooldown(data.cooldown);
        setMessage(data.cooldown > 0 ? `冷却中：${data.cooldown}秒` : "");
      });
  };

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setInterval(() => {
        setCooldown(c => Math.max(0, c - 1));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [cooldown]);

  // 缩放处理
  const handleZoomChange = (value) => {
    setZoom(value);
  };

  // 悬浮调色板
  const paletteBtnSize = 54;

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg,#e9e9f6 0%,#fafcff 100%)",
      fontFamily: "system-ui,sans-serif",
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    }}>
      <div style={{
        width: CANVAS_VIEWPORT + 48,
        background: "#fff",
        borderRadius: 16,
        boxShadow: "0 4px 24px #0002",
        padding: "32px 24px",
        position: "relative"
      }}>
        <h2 style={{
          textAlign: "center",
          margin: 0,
          fontWeight: 600,
          fontSize: 24
        }}>像素大战</h2>
        <div style={{
          textAlign: "center",
          marginBottom: 12,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: 20
        }}>
          <button
            onClick={fetchBoard}
            style={{
              padding: "4px 16px",
              borderRadius: 6,
              border: "none",
              background: "#eee",
              fontWeight: 500,
              cursor: "pointer"
            }}
          >刷新</button>
          <div style={{
            fontSize: 15,
            color: "#555",
            minWidth: 120,
            textAlign: "center"
          }}>
            {cooldown > 0 ? `冷却：${cooldown}秒` : "可点色"}
          </div>
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 6
          }}>
            <span style={{ fontSize: 14, color: "#888" }}>缩放</span>
            <input
              type="range"
              min={MIN_ZOOM}
              max={MAX_ZOOM}
              value={zoom}
              onChange={e => setZoom(Number(e.target.value))}
              style={{ width: 80 }}
            />
            <span style={{ fontSize: 14 }}>{zoom}x</span>
          </div>
        </div>
        <div style={{
          margin: "0 auto",
          border: "2px solid #444",
          borderRadius: 12,
          boxShadow: "0 2px 16px #0001",
          background: "#fafcff",
          width: CANVAS_VIEWPORT,
          height: CANVAS_VIEWPORT,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden"
        }}>
          <canvas
            ref={canvasRef}
            width={BOARD_SIZE}
            height={BOARD_SIZE}
            style={{
              width: CANVAS_VIEWPORT * zoom,
              height: CANVAS_VIEWPORT * zoom,
              cursor: cooldown > 0 ? "not-allowed" : "crosshair",
              borderRadius: 12,
              background: "#fff",
              display: loading ? "none" : "block"
            }}
            onClick={handleCanvasClick}
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
        </div>
        {message && (
          <div style={{
            color: "#d00",
            marginTop: 20,
            textAlign: "center",
            fontWeight: 500
          }}>{message}</div>
        )}

        {/* 悬浮调色板 */}
        <div style={{
          position: "fixed",
          right: 32,
          bottom: 32,
          zIndex: 9999,
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end"
        }}>
          {/* 展开色板 */}
          <div style={{
            transition: "all 0.3s",
            opacity: paletteOpen ? 1 : 0,
            pointerEvents: paletteOpen ? "auto" : "none",
            transform: paletteOpen ? "translateY(0)" : "translateY(20px)",
            marginBottom: paletteOpen ? 16 : 0,
            boxShadow: "0 4px 24px #0003",
            borderRadius: 18,
            background: "#fff",
            padding: paletteOpen ? "14px 14px 6px 14px" : "0",
            display: paletteOpen ? "grid" : "none",
            gridTemplateColumns: "repeat(5, 36px)",
            gap: "8px"
          }}>
            {COLORS.map(c => (
              <button
                key={c}
                style={{
                  background: c,
                  width: 34, height: 34,
                  borderRadius: "50%",
                  border: selectedColor === c ? "3px solid #444" : "1px solid #ccc",
                  cursor: "pointer",
                  outline: "none",
                  boxShadow: selectedColor === c ? "0 0 0 2px #8882" : "",
                  transition: "border 0.15s"
                }}
                onClick={() => {
                  setSelectedColor(c);
                  setPaletteOpen(false);
                }}
                aria-label={c}
              />
            ))}
          </div>
          {/* 悬浮按钮 */}
          <button
            onClick={() => setPaletteOpen(!paletteOpen)}
            style={{
              width: paletteBtnSize,
              height: paletteBtnSize,
              borderRadius: "50%",
              border: "none",
              background: selectedColor,
              boxShadow: "0 2px 16px #0002",
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

// HEX转RGB
function hexToRgb(hex) {
  let h = hex.replace("#", "");
  if (h.length === 3) h = h.split("").map(x => x + x).join("");
  if (h === "") return [255, 255, 255];
  const num = parseInt(h, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}
