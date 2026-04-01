import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCanvas, loadImage } from '@napi-rs/canvas';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ASSET_DIR = path.join(__dirname, '../assets/ui');
const BG_PATH = path.join(ASSET_DIR, 'release-bg.png');
const FRAME_PATH = path.join(ASSET_DIR, 'analog-border.png');

const WIDTH = 1200;
const HEIGHT = 675;

const THEME_COLORS = {
  cyan: '#7EEBFF',
  red: '#FF6B8A',
  green: '#A7FF7A',
  purple: '#B29CFF'
};

function getThemeColor(theme) {
  return THEME_COLORS[theme] || THEME_COLORS.cyan;
}

async function ensureAsset(filePath) {
  await fs.access(filePath);
}

function wrapText(ctx, text, maxWidth) {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  const lines = [];
  let current = '';

  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width <= maxWidth) {
      current = test;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }

  if (current) lines.push(current);
  return lines;
}

function fitText(ctx, text, maxWidth, startSize, family = 'sans-serif') {
  let size = startSize;
  while (size > 16) {
    ctx.font = `500 ${size}px ${family}`;
    if (ctx.measureText(text).width <= maxWidth) return size;
    size -= 2;
  }
  return size;
}

function hexToRgb(hex) {
  const clean = hex.replace('#', '');
  const value = parseInt(clean, 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255
  };
}

function drawScanlines(ctx) {
  ctx.globalAlpha = 0.08;
  ctx.fillStyle = '#FFFFFF';
  for (let y = 0; y < HEIGHT; y += 4) {
    ctx.fillRect(0, y, WIDTH, 1);
  }
  ctx.globalAlpha = 1;
}

function drawNoiseBars(ctx, themeColor) {
  const rgb = hexToRgb(themeColor);
  for (let i = 0; i < 40; i++) {
    ctx.fillStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},${Math.random() * 0.4})`;
    ctx.fillRect(
      Math.random() * WIDTH,
      Math.random() * HEIGHT,
      10 + Math.random() * 30,
      2 + Math.random() * 4
    );
  }
}

export async function renderAnnouncementCard(data) {
  await ensureAsset(BG_PATH);
  await ensureAsset(FRAME_PATH);

  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext('2d');

  const bg = await loadImage(BG_PATH);
  const frame = await loadImage(FRAME_PATH);

  const themeColor = getThemeColor(data.theme);
  const rgb = hexToRgb(themeColor);

  // 1. Background
  ctx.drawImage(bg, 0, 0, WIDTH, HEIGHT);

  // 2. Darken + tint
  ctx.fillStyle = 'rgba(0,0,0,0.65)';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.fillStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},0.12)`;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  drawScanlines(ctx);
  drawNoiseBars(ctx, themeColor);

  // 🔥 3. FRAME HERE (IMPORTANT)
  ctx.drawImage(frame, 0, 0, WIDTH, HEIGHT);

  // 4. TEXT STARTS HERE

  const left = 110;
  const top = 110;
  const contentWidth = WIDTH - 220;

  // Title
  const titleSize = fitText(ctx, data.title.toUpperCase(), contentWidth, 48);
  ctx.font = `600 ${titleSize}px sans-serif`;
  ctx.fillStyle = themeColor;
  ctx.fillText(data.title.toUpperCase(), left, top - 30);

  // Status line
  ctx.font = '500 18px monospace';
  ctx.fillStyle = '#CFCBFF';
  ctx.fillText('[ PACKET STATUS: RECOVERED ]', left, top);

  // Summary
  ctx.font = '500 22px monospace';
  ctx.fillStyle = '#FFFFFF';
  const summaryLines = wrapText(ctx, data.summary, contentWidth - 40);
  summaryLines.slice(0, 3).forEach((line, i) => {
    ctx.fillText(line, left, top + 40 + i * 28);
  });

  // Divider
  ctx.strokeStyle = themeColor;
  ctx.beginPath();
  ctx.moveTo(left, top + 110);
  ctx.lineTo(left + contentWidth - 40, top + 110);
  ctx.stroke();

  // Body box
  const boxY = top + 130;
  ctx.fillStyle = 'rgba(10,12,18,0.8)';
  ctx.fillRect(left, boxY, contentWidth - 40, 200);

  ctx.strokeStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},0.4)`;
  ctx.strokeRect(left, boxY, contentWidth - 40, 200);

  ctx.font = '500 18px monospace';
  ctx.fillStyle = '#AAA';
  ctx.fillText('[ ARCHIVE LOG ]', left + 10, boxY + 25);

  ctx.font = '500 20px monospace';
  ctx.fillStyle = '#FFF';

  const bodyLines = wrapText(ctx, data.body, contentWidth - 60);
  bodyLines.slice(0, 6).forEach((line, i) => {
    ctx.fillText(line, left + 10, boxY + 60 + i * 26);
  });

  // Footer
  ctx.font = '500 16px monospace';
  ctx.fillStyle = '#BBB';
  ctx.fillText('JUDGE // TRACE ACTIVE', left, HEIGHT - 30);

  return canvas.toBuffer('image/png');
}