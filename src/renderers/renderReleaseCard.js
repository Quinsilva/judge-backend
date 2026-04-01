import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCanvas, loadImage } from '@napi-rs/canvas';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ASSET_DIR = path.join(__dirname, '../assets/ui');
const FRAME_PATH = path.join(ASSET_DIR, 'release-frame.png');
const BG_PATH = path.join(ASSET_DIR, 'release-bg.png');

const WIDTH = 1200;
const HEIGHT = 675;

const COLORS = {
  white: '#F5F7FF',
  soft: '#B8C7E6',
  cyan: '#84E9FF',
  green: '#7DFFB3',
  orange: '#FFAA4D',
  yellow: '#FFD36B',
  line: 'rgba(255,255,255,0.12)',
  panel: 'rgba(9, 16, 33, 0.72)'
};

async function ensureAsset(filePath) {
  await fs.access(filePath);
}

function fitText(ctx, text, maxWidth, startSize) {
  let size = startSize;
  while (size > 16) {
    ctx.font = `800 ${size}px sans-serif`;
    if (ctx.measureText(text).width <= maxWidth) return size;
    size -= 2;
  }
  return size;
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

function drawPanel(ctx, x, y, w, h) {
  ctx.fillStyle = COLORS.panel;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 18);
  ctx.fill();

  ctx.strokeStyle = COLORS.line;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 18);
  ctx.stroke();
}

function drawWrappedList(ctx, items, x, y, maxWidth, lineHeight, bulletColor, textColor, maxItems = 5) {
  let cursorY = y;
  const visible = items.slice(0, maxItems);

  for (const item of visible) {
    ctx.font = '700 24px sans-serif';
    ctx.fillStyle = bulletColor;
    ctx.fillText('•', x, cursorY);

    ctx.font = '500 22px sans-serif';
    ctx.fillStyle = textColor;

    const wrapped = wrapText(ctx, item, maxWidth - 28);
    for (const line of wrapped) {
      ctx.fillText(line, x + 28, cursorY);
      cursorY += lineHeight;
    }

    cursorY += 4;
  }

  return cursorY;
}

function statusColor(status) {
  switch (status) {
    case 'stable':
      return COLORS.green;
    case 'hotfix':
      return COLORS.orange;
    case 'dev':
    default:
      return COLORS.cyan;
  }
}

export async function renderReleaseCard(data) {
  await ensureAsset(FRAME_PATH);
  await ensureAsset(BG_PATH);

  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext('2d');

  const bg = await loadImage(BG_PATH);
  const frame = await loadImage(FRAME_PATH);

  // Background
  ctx.drawImage(bg, 0, 0, WIDTH, HEIGHT);

  // Darken for readability
  const overlay = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  overlay.addColorStop(0, 'rgba(4, 8, 18, 0.25)');
  overlay.addColorStop(1, 'rgba(4, 8, 18, 0.45)');
  ctx.fillStyle = overlay;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // IMPORTANT:
  // Draw the frame BEFORE text because your frame center is black, not transparent.
  ctx.drawImage(frame, 0, 0, WIDTH, HEIGHT);

  // Content bounds
  const left = 135;
  const top = 120;
  const contentWidth = 930;

  // Title
  const fullTitle = `Release ${data.version} • ${data.buildName}`;
  const titleSize = fitText(ctx, fullTitle, 650, 40);

  ctx.font = `800 ${titleSize}px sans-serif`;
  ctx.fillStyle = COLORS.white;
  ctx.fillText(`Release ${data.version}`, left, top);

  const versionWidth = ctx.measureText(`Release ${data.version}`).width;
  ctx.font = `700 ${Math.max(titleSize - 2, 20)}px sans-serif`;
  ctx.fillStyle = COLORS.cyan;
  ctx.fillText(` • ${data.buildName}`, left + versionWidth, top);

  // Status chip
  const chipText = String(data.status || 'dev').toUpperCase();
  ctx.font = '800 20px sans-serif';
  const chipPadX = 14;
  const chipW = ctx.measureText(chipText).width + chipPadX * 2;
  const chipH = 34;
  const chipX = left;
  const chipY = top + 18;

  ctx.fillStyle = 'rgba(10, 22, 44, 0.9)';
  ctx.beginPath();
  ctx.roundRect(chipX, chipY, chipW, chipH, 10);
  ctx.fill();

  ctx.strokeStyle = statusColor(data.status);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(chipX, chipY, chipW, chipH, 10);
  ctx.stroke();

  ctx.fillStyle = statusColor(data.status);
  ctx.fillText(chipText, chipX + chipPadX, chipY + 23);

  // Divider
  ctx.strokeStyle = COLORS.line;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(left, chipY + chipH + 18);
  ctx.lineTo(left + 500, chipY + chipH + 18);
  ctx.stroke();

  // Highlights
  const highlightsY = chipY + chipH + 42;
  drawPanel(ctx, left - 10, highlightsY - 28, contentWidth, 150);

  ctx.font = '800 26px sans-serif';
  ctx.fillStyle = COLORS.yellow;
  ctx.fillText('✦ Highlights', left, highlightsY);

  const nextY = drawWrappedList(
    ctx,
    Array.isArray(data.highlights) ? data.highlights : [],
    left + 4,
    highlightsY + 38,
    contentWidth - 40,
    30,
    COLORS.cyan,
    COLORS.white,
    4
  );

  // Known issues
  const issuesTitleY = Math.max(nextY + 12, highlightsY + 135);
  drawPanel(ctx, left - 10, issuesTitleY - 28, contentWidth, 100);

  ctx.font = '800 24px sans-serif';
  ctx.fillStyle = COLORS.orange;
  ctx.fillText('⚠ Known Issues', left, issuesTitleY);

  const issues = Array.isArray(data.knownIssues) && data.knownIssues.length
    ? data.knownIssues
    : ['None'];

  const afterIssuesY = drawWrappedList(
    ctx,
    issues,
    left + 4,
    issuesTitleY + 34,
    contentWidth - 40,
    28,
    COLORS.orange,
    COLORS.white,
    2
  );

  // CTA
  const ctaY = afterIssuesY + 10;
  drawPanel(ctx, left - 10, ctaY - 28, contentWidth, 90);

  ctx.font = '800 24px sans-serif';
  ctx.fillStyle = COLORS.cyan;
  ctx.fillText('📣 Next Step', left, ctaY);

  ctx.font = '500 22px sans-serif';
  ctx.fillStyle = COLORS.white;
  const ctaLines = wrapText(
    ctx,
    data.callToAction || 'Share feedback in #alpha-feedback.',
    contentWidth - 30
  );

  ctaLines.slice(0, 2).forEach((line, index) => {
    ctx.fillText(line, left + 4, ctaY + 34 + index * 28);
  });

  // Footer
  ctx.font = '600 18px sans-serif';
  ctx.fillStyle = COLORS.soft;
  ctx.fillText('UR-Judge System', WIDTH - 210, HEIGHT - 28);

  return canvas.toBuffer('image/png');
}