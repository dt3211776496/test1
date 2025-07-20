import { useRef, useEffect, useState } from "react";

const BOARD_SIZE = 1000;
const INIT_ZOOM = 1;
const MIN_ZOOM = 1;
const MAX_ZOOM = 20;
const CANVAS_VIEWPORT = 500; // 画布显示窗口（px）

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
        // 确保每个像素都渲染成有效颜色
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
          margin: "28px 0 18px 0",
          display: "flex",
          flexWrap: "wrap",
          gap: "8px",
          justifyContent: "center"
        }}>
          {COLORS.map(c => (
            <button
              key={c}
              style={{
                background: c,
                width: 32, height: 32,
                borderRadius: 8,
                border: selectedColor === c ? "3px solid #444" : "1px solid #ccc",
                cursor: "pointer",
                outline: "none",
                boxShadow: selectedColor === c ? "0 0 0 2px #8882" : ""
              }}
              onClick={() => setSelectedColor(c)}
              aria-label={c}
            />
          ))}
        </div>
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
      </div>
    </div>
  );
}

// HEX转RGB
function hexToRgb(hex) {
  let h = hex.replace("#", "");
  if (h.length === 3) h = h.split("").map(x => x + x).join("");
  if (h === "") return [255, 255, 255]; // 空色渲染成白色
  const num = parseInt(h, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}
