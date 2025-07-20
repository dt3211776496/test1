import { useRef, useEffect, useState } from "react";

const BOARD_SIZE = 1000; // 画布尺寸
const PIXEL_SIZE = 1;    // 每像素大小
const CANVAS_SIZE = BOARD_SIZE * PIXEL_SIZE;

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
    // 30秒自动刷新一次
    const interval = setInterval(fetchBoard, 30000);
    return () => clearInterval(interval);
  }, []);

  // 渲染 Canvas
  useEffect(() => {
    if (!board.length || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d");
    const imageData = ctx.createImageData(BOARD_SIZE, BOARD_SIZE);
    for (let y = 0; y < BOARD_SIZE; y++) {
      for (let x = 0; x < BOARD_SIZE; x++) {
        const color = board[y][x] || "#FFFFFF";
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
    const x = Math.floor((e.clientX - rect.left) / scale);
    const y = Math.floor((e.clientY - rect.top) / scale);
    if (
      x < 0 || x >= BOARD_SIZE ||
      y < 0 || y >= BOARD_SIZE
    ) return;
    fetch("/api/paint", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ x, y, color: selectedColor }),
    })
      .then(res => res.json())
      .then(data => {
        setBoard(data.board);
        setCooldown(data.cooldown);
        setMessage(data.cooldown > 0 ? `冷却中：${data.cooldown}秒` : "点色成功！");
      });
  };

  // 冷却倒计时
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setInterval(() => {
        setCooldown(c => Math.max(0, c - 1));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [cooldown]);

  return (
    <div style={{ padding: 20, fontFamily: "sans-serif" }}>
      <h1>像素大战 Canvas 高性能版</h1>
      <div style={{ marginBottom: 10 }}>
        <span>选择颜色：</span>
        {COLORS.map(c => (
          <button
            key={c}
            style={{
              background: c,
              width: 32, height: 32, margin: 2,
              border: selectedColor === c ? "3px solid #444" : "1px solid #ccc", cursor: "pointer"
            }}
            onClick={() => setSelectedColor(c)}
          />
        ))}
      </div>
      <button onClick={fetchBoard} style={{ marginBottom: 10 }}>刷新画布</button>
      <span style={{ marginLeft: 16, color: "#888" }}>
        {cooldown > 0 ? `冷却中：${cooldown}秒` : "可立即点色"}
      </span>
      <div style={{ marginTop: 16, border: "2px solid #444", background: "#eee", display: "inline-block" }}>
        <canvas
          ref={canvasRef}
          width={BOARD_SIZE}
          height={BOARD_SIZE}
          style={{
            width: 500, // 缩放显示，实际画布仍为1000x1000
            height: 500,
            cursor: cooldown > 0 ? "not-allowed" : "crosshair",
            display: loading ? "none" : "block"
          }}
          onClick={handleCanvasClick}
        />
        {loading && <div style={{ width: 500, height: 500, display: "flex", alignItems: "center", justifyContent: "center" }}>加载中...</div>}
      </div>
      <p style={{ marginTop: 16, color: "#888" }}>
        Tips: 点击画布上色，冷却期间无法连续点色。画布会自动刷新，也可手动刷新。
      </p>
      {message && <div style={{ color: "#d00", marginTop: 8 }}>{message}</div>}
      <p style={{ color: "#888" }}>
        免费 Vercel 版本仅支持临时数据，冷启动会清空。高级功能如用户系统/阵营/聊天/历史需自建后端。
      </p>
    </div>
  );
}

// HEX转RGB
function hexToRgb(hex) {
  let h = hex.replace("#", "");
  if (h.length === 3) h = h.split("").map(x => x + x).join("");
  const num = parseInt(h, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}