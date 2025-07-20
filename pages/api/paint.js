import { parse } from "cookie";

const BOARD_SIZE = 1000;
let board = global.pixelBoard;
if (!board) {
  board = Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => "")
  );
  global.pixelBoard = board;
}

export default function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method Not Allowed" });
    return;
  }

  const { x, y, color } = req.body;
  if (
    typeof x !== "number" || typeof y !== "number" || typeof color !== "string" ||
    x < 0 || x >= BOARD_SIZE || y < 0 || y >= BOARD_SIZE
  ) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }

  // 冷却机制（cookie）
  const cookies = req.headers.cookie ? parse(req.headers.cookie) : {};
  let cooldown = 0;
  if (cookies.lastPaint) {
    const lastPaint = parseInt(cookies.lastPaint);
    const now = Date.now();
    cooldown = Math.max(0, 60 - Math.floor((now - lastPaint) / 1000));
    if (cooldown > 0) {
      res.status(200).json({ board, cooldown });
      return;
    }
  }

  // 点色
  board[y][x] = color;

  // 设置新冷却cookie
  res.setHeader("Set-Cookie", `lastPaint=${Date.now()}; path=/; max-age=3600; HttpOnly`);
  res.status(200).json({ board, cooldown: 60 });
}