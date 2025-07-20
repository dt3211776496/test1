import { parse } from "cookie";

// 画布内存存储
const BOARD_SIZE = 1000;
let board = global.pixelBoard;
if (!board) {
  board = Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => "")
  );
  global.pixelBoard = board;
}

export default function handler(req, res) {
  // 冷却机制（基于 cookie）
  let cooldown = 0;
  const cookies = req.headers.cookie ? parse(req.headers.cookie) : {};
  if (cookies.lastPaint) {
    const lastPaint = parseInt(cookies.lastPaint);
    const now = Date.now();
    cooldown = Math.max(0, 60 - Math.floor((now - lastPaint) / 1000));
  }
  res.status(200).json({ board, cooldown });
}