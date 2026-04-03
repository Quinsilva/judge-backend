import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCanvas, loadImage } from '@napi-rs/canvas';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ASSET_DIR = path.join(__dirname, '../assets/ui');
const NOTE_PATH = path.join(ASSET_DIR, 'render-note.png');

const WIDTH = 900;
const HEIGHT = 520;

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

function fitText(ctx, text, maxWidth, startSize, weight = 600, family = 'sans-serif') {
  let size = startSize;
  while (size > 16) {
    ctx.font = `${weight} ${size}px ${family}`;
    if (ctx.measureText(text).width <= maxWidth) return size;
    size -= 2;
  }
  return size;
}

function formatReminderSchedule(data) {
  const start = `${data.startDateText} ${data.startTimeText}`;
  const endDate = data.endDateText || data.startDateText;

  if (data.endTimeText) {
    return `${start} → ${endDate} ${data.endTimeText}${data.timezone ? ` ${data.timezone}` : ''}`;
  }

  if (data.endDateText && data.endDateText !== data.startDateText) {
    return `${start} → ${data.endDateText}${data.timezone ? ` ${data.timezone}` : ''}`;
  }

  return `${start}${data.timezone ? ` ${data.timezone}` : ''}`;
}

function drawTextLines(ctx, lines, x, y, lineHeight, maxLines) {
  for (let i = 0; i < Math.min(lines.length, maxLines); i += 1) {
    ctx.fillText(lines[i], x, y + i * lineHeight);
  }
}

export async function renderEventReminderNote(data) {
  await ensureAsset(NOTE_PATH);

  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext('2d');

  const note = await loadImage(NOTE_PATH);
  const themeColor = getThemeColor(data.theme);

  // Base transparent-styled note image
  ctx.drawImage(note, 0, 0, WIDTH, HEIGHT);

  // Text last
  ctx.save();
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.shadowBlur = 0;
  ctx.shadowColor = 'transparent';

  // Header
  ctx.font = '500 18px monospace';
  ctx.fillStyle = themeColor;
  ctx.fillText(`[ EVENT REMINDER // T-${data.minutesBefore} ]`, 88, 78);

  // Title
  const titleText = String(data.title || 'EVENT').toUpperCase();
  const titleSize = fitText(ctx, titleText, 720, 36, 600);
  ctx.font = `600 ${titleSize}px sans-serif`;
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(titleText, 88, 138);

  // Description
  ctx.font = '500 20px monospace';
  ctx.fillStyle = '#E7E2F1';
  const descLines = wrapText(ctx, data.description || '', 720);
  drawTextLines(ctx, descLines, 88, 182, 28, 3);

  // Schedule label
  ctx.font = '500 18px monospace';
  ctx.fillStyle = themeColor;
  ctx.fillText('[ SCHEDULE ]', 88, 298);

  // Schedule value
  ctx.font = '500 22px monospace';
  ctx.fillStyle = '#FFFFFF';
  const scheduleLines = wrapText(ctx, formatReminderSchedule(data), 720);
  drawTextLines(ctx, scheduleLines, 88, 336, 28, 2);

  // Voice label
  ctx.font = '500 18px monospace';
  ctx.fillStyle = themeColor;
  ctx.fillText('[ VOICE ]', 88, 408);

  // Voice value
  ctx.font = '500 22px monospace';
  ctx.fillStyle = '#FFFFFF';
  const voiceLines = wrapText(ctx, data.voiceChannelName || 'Not specified', 720);
  drawTextLines(ctx, voiceLines, 88, 446, 28, 2);

  // Footer
  ctx.font = '500 15px monospace';
  ctx.fillStyle = '#C9C3DF';
  ctx.fillText('JUDGE // DIGITAL STICKY NOTE // REMINDER SIGNAL LIVE', 88, 494);

  ctx.restore();

  return canvas.toBuffer('image/png');
}