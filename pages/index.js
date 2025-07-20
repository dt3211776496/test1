import { useState, useEffect } from "react";

const BOARD_SIZE = 1000; // 画布尺寸：1000x1000
const PIXEL_SIZE = 1;    // 每个像素显示大小

const COLORS = [
  "#FFFFFF", "#000000", "#FF0000", "#00FF00", "#0000FF",
  "#FFFF00", "#FF00FF", "#00FFFF", "#FFA500", "#800080",
  "#008000", "#C0C0C0", "#A52A2A", "#FFD700", "#ADFF2F"
];

export default function Home() {
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);
  const [board, setBoard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cooldown, setCooldown] = useState(0);

  // 获取画布
  useEffect(() => {
    fetch("/api/board")
      .then(res => res.json())
      .then(data => {
        setBoard(data.board);
        setCooldown(data.cooldown);
        setLoading(false);
      });
  }, []);

  // 点色
  const handlePixelClick = (x, y) => {
    if (cooldown > 0) {
      alert(`冷却中，请等待 ${cooldown} 秒`);
      return;
    }
    fetch("/api/paint", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ x, y, color: selectedColor }),
    })
      .then(res => res.json())
      .then(data => {
        setBoard(data.board);
        setCooldown(data.cooldown);
      });
  };

  // 刷新画布
  const refreshBoard = () => {
    setLoading(true);
    fetch("/api/board")
      .then(res => res.json())
      .then(data => {
        setBoard(data.board);
        setCooldown(data.cooldown);
        setLoading(false);
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
      <h1>像素大战 - Vercel 极限还原</h1>
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
      <button onClick={refreshBoard} style={{ marginBottom: 10 }}>刷新画布</button>
      <span style={{ marginLeft: 16, color: "#888" }}>
        {cooldown > 0 ? `冷却中：${cooldown}秒` : "可立即点色"}
      </span>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${BOARD_SIZE}, ${PIXEL_SIZE}px)`,
          width: BOARD_SIZE * PIXEL_SIZE,
          border: "1px solid #444",
          background: "#ddd",
          userSelect: "none",
          marginTop: 16
        }}
      >
        {loading ? (
          <div style={{ gridColumn: `span ${BOARD_SIZE}` }}>加载中...</div>
        ) : (
          board.map((row, y) =>
            row.map((color, x) => (
              <div
                key={`${x}-${y}`}
                onClick={() => handlePixelClick(x, y)}
                style={{
                  width: PIXEL_SIZE,
                  height: PIXEL_SIZE,
                  background: color || "#fff",
                  cursor: "pointer"
                }}
                title={`(${x},${y})`}
              />
            ))
          )
        )}
      </div>
      <p style={{ marginTop: 16, color: "#888" }}>
        Tips: 点击任意格子上色，每次点色后需等待冷却时间。画布大，建议电脑访问体验。
      </p>
      <p style={{ color: "#888" }}>
        免费 Vercel 版本仅支持临时数据，冷启动会清空画布。高级功能如登录/阵营/聊天/历史需自建后端。
      </p>
    </div>
  );
}