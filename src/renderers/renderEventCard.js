import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCanvas, loadImage } from '@napi-rs/canvas';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ASSET_DIR = path.join(__dirname, '../assets/ui');
const BG_PATH = path.join(ASSET_DIR, 'release-bg.png');
const FRAME_PATH = path.join(ASSET_DIR, 'render-card.png');

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

function hexToRgb(hex) {
  const clean = hex.replace('#', '');
  const value = parseInt(clean, 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255
  };
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

function formatDisplayDateTime(dateText, timeText) {
  if (!dateText || !timeText) return '-';

  const value = new Date(`${dateText}T${timeText}:00`);
  if (Number.isNaN(value.getTime())) {
    return `${dateText} ${timeText}`;
  }

  const month = value.toLocaleString('en-US', { month: 'short' });
  const day = value.getDate();
  const year = value.getFullYear();
  const hour = value.toLocaleString('en-US', {
    hour: 'numeric',
    hour12: true
  });

  return `${month}, ${day}, ${year} at ${hour}`;
}

function formatEventRange(data) {
  const start = formatDisplayDateTime(data.startDateText, data.startTimeText);

  if (data.endDateText && data.endTimeText) {
    const end = formatDisplayDateTime(data.endDateText, data.endTimeText);
    return `${start} → ${end}`;
  }

  if (data.endDateText && data.endDateText !== data.startDateText) {
    return `${start} → ${data.endDateText}`;
  }

  return start;
}

function drawScanlines(ctx) {
  ctx.save();
  try {
    ctx.globalAlpha = 0.08;
    ctx.fillStyle = '#FFFFFF';
    for (let y = 0; y < HEIGHT; y += 4) {
      ctx.fillRect(0, y, WIDTH, 1);
    }
  } finally {
    ctx.restore();
  }
}

function drawNoiseBars(ctx, themeColor) {
  const rgb = hexToRgb(themeColor);

  ctx.save();
  try {
    ctx.globalAlpha = 0.16;

    for (let i = 0; i < 36; i += 1) {
      ctx.fillStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},${0.15 + Math.random() * 0.22})`;
      ctx.fillRect(
        Math.random() * WIDTH,
        Math.random() * HEIGHT,
        20 + Math.random() * 48,
        2 + Math.random() * 5
      );
    }
  } finally {
    ctx.restore();
  }
}

function isImageAttachment(attachment) {
  return Boolean(
    attachment &&
      typeof attachment.url === 'string' &&
      typeof attachment.contentType === 'string' &&
      attachment.contentType.startsWith('image/')
  );
}

async function tryLoadAttachmentImage(attachment) {
  if (!isImageAttachment(attachment)) return null;

  try {
    return await loadImage(attachment.url);
  } catch (error) {
    console.error('Failed to load event renderer attachment:', error);
    return null;
  }
}

function drawContainedImageSafe(ctx, image, x, y, w, h, radius = 10, background = 'rgba(0,0,0,0.18)') {
  ctx.save();
  try {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, radius);
    ctx.clip();

    ctx.fillStyle = background;
    ctx.fillRect(x, y, w, h);

    const imgRatio = image.width / image.height;
    const boxRatio = w / h;

    let drawW;
    let drawH;
    let drawX;
    let drawY;

    if (imgRatio > boxRatio) {
      drawW = w;
      drawH = drawW / imgRatio;
      drawX = x;
      drawY = y + (h - drawH) / 2;
    } else {
      drawH = h;
      drawW = drawH * imgRatio;
      drawX = x + (w - drawW) / 2;
      drawY = y;
    }

    ctx.drawImage(image, drawX, drawY, drawW, drawH);
  } finally {
    ctx.restore();
  }
}

function drawTextLines(ctx, lines, x, y, lineHeight, maxLines) {
  for (let i = 0; i < Math.min(lines.length, maxLines); i += 1) {
    ctx.fillText(lines[i], x, y + i * lineHeight);
  }
}

export async function renderEventCard(data) {
  await ensureAsset(BG_PATH);
  await ensureAsset(FRAME_PATH);

  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext('2d');

  const bg = await loadImage(BG_PATH);
  const frame = await loadImage(FRAME_PATH);

  const themeColor = getThemeColor(data.theme);
  const rgb = hexToRgb(themeColor);

  const thumbnailImage = await tryLoadAttachmentImage(data.thumbnail);
  const bannerImage = await tryLoadAttachmentImage(data.image);

  // Base layers
  ctx.save();
  try {
    ctx.drawImage(bg, 0, 0, WIDTH, HEIGHT);

    ctx.fillStyle = 'rgba(0,0,0,0.72)';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    ctx.fillStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},0.08)`;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
  } finally {
    ctx.restore();
  }

  drawScanlines(ctx);
  drawNoiseBars(ctx, themeColor);

  // Card art stays behind content
  ctx.save();
  try {
    ctx.drawImage(frame, 0, 0, WIDTH, HEIGHT);
  } finally {
    ctx.restore();
  }

  // Layout
  const left = 96;
  const rightColumnW = thumbnailImage ? 250 : 0;
  const gap = thumbnailImage ? 28 : 0;
  const mainW = WIDTH - 192 - rightColumnW - gap;

  const thumbX = left + mainW + gap;
  const thumbY = 118;
  const thumbW = rightColumnW;
  const thumbH = 214;

  const bannerX = left;
  const bannerY = 520;
  const bannerW = mainW;
  const bannerH = 88;

  // Image layers — each isolated
  if (thumbnailImage) {
    try {
      drawContainedImageSafe(
        ctx,
        thumbnailImage,
        thumbX + 12,
        thumbY + 12,
        thumbW - 24,
        thumbH - 24,
        10,
        'rgba(0,0,0,0.28)'
      );
    } catch (error) {
      console.error('Failed to draw event thumbnail:', error);
    }
  }

  if (bannerImage) {
    try {
      drawContainedImageSafe(
        ctx,
        bannerImage,
        bannerX + 8,
        bannerY + 8,
        bannerW - 16,
        bannerH - 16,
        10,
        'rgba(0,0,0,0.28)'
      );
    } catch (error) {
      console.error('Failed to draw event banner:', error);
    }
  }

  // Final text pass — fully independent
  ctx.save();
  try {
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.shadowBlur = 0;
    ctx.shadowColor = 'transparent';

    ctx.font = '500 16px monospace';
    ctx.fillStyle = themeColor;
    ctx.fillText('[ LIVE EVENT DOSSIER ]', left, 88);

    const titleText = String(data.title || 'EVENT').toUpperCase();
    const titleSize = fitText(ctx, titleText, mainW, 42, 600);
    ctx.font = `600 ${titleSize}px sans-serif`;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(titleText, left, 158);

    ctx.font = '500 20px monospace';
    ctx.fillStyle = '#D8D2EE';
    const descLines = wrapText(ctx, data.description || '', mainW - 8);
    drawTextLines(ctx, descLines, left, 212, 28, 3);

    ctx.font = '500 17px monospace';
    ctx.fillStyle = themeColor;
    ctx.fillText('[ SCHEDULE ]', left, 356);
    ctx.fillText('[ ZONE ]', left, 446);
    ctx.fillText('[ VOICE ]', left + 420, 446);

    ctx.font = '500 20px monospace';
    ctx.fillStyle = '#FFFFFF';
    const scheduleLines = wrapText(ctx, formatEventRange(data), mainW - 8);
    drawTextLines(ctx, scheduleLines, left, 394, 26, 2);

    ctx.fillText(data.timezone || 'UTC', left, 482);
    ctx.fillText(data.voiceChannelName || 'Not specified', left + 420, 482);

    ctx.font = '500 15px monospace';
    ctx.fillStyle = '#BEB7D4';
    ctx.fillText('JUDGE // EVENT CARD // SIGNAL VERIFIED', left, 642);
  } finally {
    ctx.restore();
  }

  return canvas.toBuffer('image/png');
}