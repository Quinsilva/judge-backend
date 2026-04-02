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
  ctx.save();
  ctx.globalAlpha = 0.08;
  ctx.fillStyle = '#FFFFFF';

  for (let y = 0; y < HEIGHT; y += 4) {
    ctx.fillRect(0, y, WIDTH, 1);
  }

  ctx.restore();
}

function drawNoiseBars(ctx, themeColor) {
  ctx.save();
  const rgb = hexToRgb(themeColor);
  ctx.globalAlpha = 0.18;

  for (let i = 0; i < 40; i += 1) {
    ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${Math.random() * 0.4})`;
    ctx.fillRect(
      Math.random() * WIDTH,
      Math.random() * HEIGHT,
      10 + Math.random() * 30,
      2 + Math.random() * 4
    );
  }

  ctx.restore();
}

function drawTextBlock(ctx, lines, x, y, lineHeight, color, maxLines) {
  ctx.fillStyle = color;
  for (let i = 0; i < Math.min(lines.length, maxLines); i += 1) {
    ctx.fillText(lines[i], x, y + i * lineHeight);
  }
}

function roundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function clipRoundedRect(ctx, x, y, w, h, r) {
  roundedRect(ctx, x, y, w, h, r);
  ctx.clip();
}

function isImageAttachment(attachment) {
  return Boolean(
    attachment &&
      typeof attachment.url === 'string' &&
      typeof attachment.contentType === 'string' &&
      attachment.contentType.startsWith('image/')
  );
}

async function tryLoadAttachmentImage(attachment, label) {
  if (!isImageAttachment(attachment)) {
    return null;
  }

  try {
    return await loadImage(attachment.url);
  } catch (error) {
    console.error(`Failed to load ${label} into renderer:`, error);
    return null;
  }
}

function drawCoverImage(ctx, image, x, y, w, h, radius = 10) {
  ctx.save();
  clipRoundedRect(ctx, x, y, w, h, radius);

  const imgRatio = image.width / image.height;
  const boxRatio = w / h;

  let drawW;
  let drawH;
  let drawX;
  let drawY;

  if (imgRatio > boxRatio) {
    drawH = h;
    drawW = drawH * imgRatio;
    drawX = x - (drawW - w) / 2;
    drawY = y;
  } else {
    drawW = w;
    drawH = drawW / imgRatio;
    drawX = x;
    drawY = y - (drawH - h) / 2;
  }

  ctx.drawImage(image, drawX, drawY, drawW, drawH);
  ctx.restore();
}

function drawThumbnailPanel(ctx, image, x, y, w, h, themeColor) {
  const rgb = hexToRgb(themeColor);

  ctx.fillStyle = 'rgba(8, 10, 16, 0.82)';
  roundedRect(ctx, x, y, w, h, 12);
  ctx.fill();

  ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.45)`;
  ctx.lineWidth = 2;
  roundedRect(ctx, x, y, w, h, 12);
  ctx.stroke();

  ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.18)`;
  roundedRect(ctx, x + 12, y + 12, 110, 28, 8);
  ctx.fill();

  ctx.font = '500 14px monospace';
  ctx.fillStyle = themeColor;
  ctx.fillText('[ VISUAL ]', x + 22, y + 31);

  const pad = 14;
  const innerX = x + pad;
  const innerY = y + 50;
  const innerW = w - pad * 2;
  const innerH = h - 64;

  drawCoverImage(ctx, image, innerX, innerY, innerW, innerH, 10);

  const fade = ctx.createLinearGradient(0, innerY, 0, innerY + innerH);
  fade.addColorStop(0, 'rgba(0,0,0,0)');
  fade.addColorStop(1, 'rgba(0,0,0,0.35)');
  ctx.fillStyle = fade;
  roundedRect(ctx, innerX, innerY, innerW, innerH, 10);
  ctx.fill();

  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth = 1;
  roundedRect(ctx, innerX, innerY, innerW, innerH, 10);
  ctx.stroke();
}

function drawBannerPanel(ctx, image, x, y, w, h, themeColor) {
  const rgb = hexToRgb(themeColor);

  ctx.fillStyle = 'rgba(8, 10, 16, 0.82)';
  roundedRect(ctx, x, y, w, h, 12);
  ctx.fill();

  ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.38)`;
  ctx.lineWidth = 1.5;
  roundedRect(ctx, x, y, w, h, 12);
  ctx.stroke();

  drawCoverImage(ctx, image, x + 10, y + 10, w - 20, h - 20, 10);

  const fade = ctx.createLinearGradient(0, y, 0, y + h);
  fade.addColorStop(0, 'rgba(0,0,0,0.08)');
  fade.addColorStop(1, 'rgba(0,0,0,0.32)');
  ctx.fillStyle = fade;
  roundedRect(ctx, x + 10, y + 10, w - 20, h - 20, 10);
  ctx.fill();
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

  const thumbnailImage = await tryLoadAttachmentImage(data.thumbnail, 'announcement thumbnail');
  const attachedImage = await tryLoadAttachmentImage(data.image, 'announcement image');

  ctx.drawImage(bg, 0, 0, WIDTH, HEIGHT);

  ctx.fillStyle = 'rgba(0,0,0,0.65)';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.fillStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},0.12)`;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  drawScanlines(ctx);
  drawNoiseBars(ctx, themeColor);

  // frame before text because current border asset is not transparent
  ctx.drawImage(frame, 0, 0, WIDTH, HEIGHT);

  const left = 110;
  const top = 110;
  const rightColumnWidth = thumbnailImage ? 250 : 0;
  const gap = thumbnailImage ? 28 : 0;
  const contentWidth = WIDTH - 220 - rightColumnWidth - gap;

  const titleText = String(data.title || 'ANNOUNCEMENT').toUpperCase();
  const titleSize = fitText(ctx, titleText, contentWidth, 48);
  ctx.font = `600 ${titleSize}px sans-serif`;
  ctx.fillStyle = themeColor;
  ctx.fillText(titleText, left, top - 30);

  ctx.font = '500 18px monospace';
  ctx.fillStyle = '#CFCBFF';
  ctx.fillText('[ PACKET STATUS: RECOVERED ]', left, top);

  ctx.font = '500 22px monospace';
  const summaryLines = wrapText(ctx, data.summary || '', contentWidth - 20);
  drawTextBlock(ctx, summaryLines, left, top + 40, 28, '#FFFFFF', 3);

  ctx.strokeStyle = themeColor;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(left, top + 110);
  ctx.lineTo(left + contentWidth - 10, top + 110);
  ctx.stroke();

  const boxY = top + 130;
  const boxW = contentWidth - 10;
  const boxH = attachedImage ? 165 : 210;

  ctx.fillStyle = 'rgba(10,12,18,0.82)';
  ctx.fillRect(left, boxY, boxW, boxH);

  ctx.strokeStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},0.4)`;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(left, boxY, boxW, boxH);

  ctx.font = '500 18px monospace';
  ctx.fillStyle = '#AAA';
  ctx.fillText('[ ARCHIVE LOG ]', left + 10, boxY + 25);

  ctx.font = '500 20px monospace';
  const bodyLines = wrapText(ctx, data.body || '', boxW - 24);
  drawTextBlock(ctx, bodyLines, left + 10, boxY + 60, 26, '#FFFFFF', attachedImage ? 4 : 6);

  let cursorY = boxY + boxH + 24;

  if (attachedImage) {
    drawBannerPanel(ctx, attachedImage, left, cursorY, boxW, 120, themeColor);
    cursorY += 138;
  }

  if (data.link) {
    ctx.font = '500 18px monospace';
    ctx.fillStyle = themeColor;
    ctx.fillText('[ UPLINK ]', left, cursorY);

    const linkLines = wrapText(ctx, data.link, contentWidth - 20);
    ctx.font = '500 17px monospace';
    drawTextBlock(ctx, linkLines, left, cursorY + 30, 22, themeColor, 2);
  }

  if (thumbnailImage) {
    const thumbX = left + contentWidth + gap;
    const thumbY = top + 10;
    const thumbW = rightColumnWidth;
    const thumbH = 330;

    drawThumbnailPanel(ctx, thumbnailImage, thumbX, thumbY, thumbW, thumbH, themeColor);
  }

  ctx.font = '500 16px monospace';
  ctx.fillStyle = '#BBB';
  ctx.fillText('JUDGE // TRACE ACTIVE', left, HEIGHT - 30);

  return canvas.toBuffer('image/png');
}