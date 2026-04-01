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
    ctx.font = '700 32px sans-serif';
    ctx.fillStyle = bulletColor;
    ctx.fillText('•', x, cursorY);

    ctx.font = '500 30px sans-serif';
    ctx.fillStyle = textColor;

    const wrapped = wrapText(ctx, item, maxWidth - 36);
    for (const line of wrapped) {
      ctx.fillText(line, x + 36, cursorY);
      cursorY += lineHeight;
    }

    cursorY += 6;
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

  ctx.drawImage(bg, 0, 0, WIDTH, HEIGHT);

  const overlay = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  overlay.addColorStop(0, 'rgba(4, 8, 18, 0.35)');
  overlay.addColorStop(1, 'rgba(4, 8, 18, 0.55)');
  ctx.fillStyle = overlay;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  const left = 170;
  const top = 185;
  const contentWidth = 1180;

  const fullTitle = `Release ${data.version} • ${data.buildName}`;
  const titleSize = fitText(ctx, fullTitle, 760, 58);

  ctx.font = `800 ${titleSize}px sans-serif`;
  ctx.fillStyle = COLORS.white;
  ctx.fillText(`Release ${data.version}`, left, top);

  const versionWidth = ctx.measureText(`Release ${data.version}`).width;
  ctx.font = `700 ${Math.max(titleSize - 2, 24)}px sans-serif`;
  ctx.fillStyle = COLORS.cyan;
  ctx.fillText(` • ${data.buildName}`, left + versionWidth, top);

  const chipText = String(data.status || 'dev').toUpperCase();
  ctx.font = '800 28px sans-serif';
  const chipPadX = 18;
  const chipW = ctx.measureText(chipText).width + chipPadX * 2;
  const chipH = 46;
  const chipX = left;
  const chipY = top + 36;

  ctx.fillStyle = 'rgba(10, 22, 44, 0.82)';
  ctx.beginPath();
  ctx.roundRect(chipX, chipY, chipW, chipH, 12);
  ctx.fill();

  ctx.strokeStyle = statusColor(data.status);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(chipX, chipY, chipW, chipH, 12);
  ctx.stroke();

  ctx.fillStyle = statusColor(data.status);
  ctx.fillText(chipText, chipX + chipPadX, chipY + 31);

  ctx.strokeStyle = COLORS.line;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(left, chipY + chipH + 28);
  ctx.lineTo(left + 700, chipY + chipH + 28);
  ctx.stroke();

  const highlightsY = chipY + chipH + 56;
  drawPanel(ctx, left - 16, highlightsY - 40, contentWidth - 140, 245);

  ctx.font = '800 36px sans-serif';
  ctx.fillStyle = COLORS.yellow;
  ctx.fillText('✦ Highlights', left, highlightsY);

  const nextY = drawWrappedList(
    ctx,
    Array.isArray(data.highlights) ? data.highlights : [],
    left + 8,
    highlightsY + 56,
    contentWidth - 200,
    42,
    COLORS.cyan,
    COLORS.white,
    5
  );

  const issuesTitleY = Math.max(nextY + 22, highlightsY + 190);
  drawPanel(ctx, left - 16, issuesTitleY - 40, contentWidth - 140, 150);

  ctx.font = '800 34px sans-serif';
  ctx.fillStyle = COLORS.orange;
  ctx.fillText('⚠ Known Issues', left, issuesTitleY);

  const issues = Array.isArray(data.knownIssues) && data.knownIssues.length
    ? data.knownIssues
    : ['None'];

  const afterIssuesY = drawWrappedList(
    ctx,
    issues,
    left + 8,
    issuesTitleY + 52,
    contentWidth - 200,
    40,
    COLORS.orange,
    COLORS.white,
    3
  );

  const ctaY = afterIssuesY + 18;
  drawPanel(ctx, left - 16, ctaY - 40, contentWidth - 140, 120);

  ctx.font = '800 34px sans-serif';
  ctx.fillStyle = COLORS.cyan;
  ctx.fillText('📣 Next Step', left, ctaY);

  ctx.font = '500 30px sans-serif';
  ctx.fillStyle = COLORS.white;
  const ctaLines = wrapText(
    ctx,
    data.callToAction || 'Share feedback in #alpha-feedback.',
    contentWidth - 180
  );

  ctaLines.slice(0, 2).forEach((line, index) => {
    ctx.fillText(line, left + 8, ctaY + 48 + index * 38);
  });

  ctx.font = '600 24px sans-serif';
  ctx.fillStyle = COLORS.soft;
  ctx.fillText('UR-Judge System', WIDTH - 360, HEIGHT - 52);

  ctx.drawImage(frame, 0, 0, WIDTH, HEIGHT);

  return canvas.toBuffer('image/png');
}