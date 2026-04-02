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

function hexToRgb(hex) {
  const clean = hex.replace('#', '');
  const value = parseInt(clean, 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255
  };
}

function fitText(ctx, text, maxWidth, startSize, weight = 600, family = 'sans-serif') {
  let size = startSize;

  while (size > 14) {
    ctx.font = `${weight} ${size}px ${family}`;
    if (ctx.measureText(text).width <= maxWidth) {
      return size;
    }
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

function drawPanel(ctx, x, y, w, h, themeColor, fillAlpha = 0.82) {
  const rgb = hexToRgb(themeColor);

  ctx.fillStyle = `rgba(8, 10, 16, ${fillAlpha})`;
  roundedRect(ctx, x, y, w, h, 12);
  ctx.fill();

  ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.38)`;
  ctx.lineWidth = 1.5;
  roundedRect(ctx, x, y, w, h, 12);
  ctx.stroke();
}

function clipRoundedRect(ctx, x, y, w, h, r) {
  roundedRect(ctx, x, y, w, h, r);
  ctx.clip();
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
  ctx.globalAlpha = 0.16;

  for (let i = 0; i < 32; i += 1) {
    ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${0.18 + Math.random() * 0.25})`;
    ctx.fillRect(
      Math.random() * WIDTH,
      Math.random() * HEIGHT,
      12 + Math.random() * 34,
      2 + Math.random() * 4
    );
  }

  ctx.restore();
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
    console.error(`Failed to load ${label}:`, error);
    return null;
  }
}

/**
 * Fit the full image inside the panel bounds.
 * No cropping, no overflow.
 */
function drawContainImage(ctx, image, x, y, w, h, radius = 10, background = 'rgba(0,0,0,0.18)') {
  ctx.save();

  clipRoundedRect(ctx, x, y, w, h, radius);

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
  ctx.restore();
}

function drawBannerPanel(ctx, image, x, y, w, h, themeColor) {
  drawPanel(ctx, x, y, w, h, themeColor, 0.86);

  const innerPad = 10;
  const innerX = x + innerPad;
  const innerY = y + innerPad;
  const innerW = w - innerPad * 2;
  const innerH = h - innerPad * 2;

  drawContainImage(ctx, image, innerX, innerY, innerW, innerH, 10);

  const fade = ctx.createLinearGradient(0, innerY, 0, innerY + innerH);
  fade.addColorStop(0, 'rgba(0,0,0,0.04)');
  fade.addColorStop(1, 'rgba(0,0,0,0.18)');
  ctx.fillStyle = fade;
  roundedRect(ctx, innerX, innerY, innerW, innerH, 10);
  ctx.fill();
}

function drawThumbnailPanel(ctx, image, x, y, w, h, themeColor) {
  drawPanel(ctx, x, y, w, h, themeColor, 0.84);

  const innerPad = 14;
  const innerX = x + innerPad;
  const innerY = y + 54;
  const innerW = w - innerPad * 2;
  const innerH = h - 68;

  drawContainImage(ctx, image, innerX, innerY, innerW, innerH, 10);

  const fade = ctx.createLinearGradient(0, innerY, 0, innerY + innerH);
  fade.addColorStop(0, 'rgba(0,0,0,0.02)');
  fade.addColorStop(1, 'rgba(0,0,0,0.22)');
  ctx.fillStyle = fade;
  roundedRect(ctx, innerX, innerY, innerW, innerH, 10);
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
  const bannerImage = await tryLoadAttachmentImage(data.image, 'announcement image');

  // 1. Background
  ctx.drawImage(bg, 0, 0, WIDTH, HEIGHT);

  // 2. Tint / effects
  ctx.fillStyle = 'rgba(0,0,0,0.66)';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.fillStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},0.10)`;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  drawScanlines(ctx);
  drawNoiseBars(ctx, themeColor);

  // 3. Frame behind panels/text
  ctx.drawImage(frame, 0, 0, WIDTH, HEIGHT);

  // Layout
  const left = 110;
  const top = 110;
  const rightColumnWidth = thumbnailImage ? 250 : 0;
  const rightGap = thumbnailImage ? 26 : 0;
  const mainWidth = WIDTH - 220 - rightColumnWidth - rightGap;

  // ---- PANELS + IMAGES FIRST ----

  const summaryX = left;
  const summaryY = top + 18;
  const summaryW = mainWidth;
  const summaryH = 108;

  drawPanel(ctx, summaryX, summaryY, summaryW, summaryH, themeColor, 0.74);

  const bodyX = left;
  const bodyY = summaryY + summaryH + 22;
  const bodyW = mainWidth;
  const bodyH = bannerImage ? 150 : 230;

  drawPanel(ctx, bodyX, bodyY, bodyW, bodyH, themeColor, 0.82);

  let cursorY = bodyY + bodyH + 18;

  if (bannerImage) {
    const bannerH = 118;
    drawBannerPanel(ctx, bannerImage, left, cursorY, mainWidth, bannerH, themeColor);
    cursorY += bannerH + 20;
  }

  if (thumbnailImage) {
    const thumbX = left + mainWidth + rightGap;
    const thumbY = summaryY;
    const thumbW = rightColumnWidth;
    const thumbH = 330;

    drawThumbnailPanel(ctx, thumbnailImage, thumbX, thumbY, thumbW, thumbH, themeColor);

    // label panel for thumbnail
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    roundedRect(ctx, thumbX + 14, thumbY + 14, 112, 28, 8);
    ctx.fill();
  }

  // Divider line panel accent
  ctx.strokeStyle = themeColor;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(left, top + 126);
  ctx.lineTo(left + mainWidth - 10, top + 126);
  ctx.stroke();

  // ---- TEXT LAST ----

  const titleText = String(data.title || 'ANNOUNCEMENT').toUpperCase();
  const titleSize = fitText(ctx, titleText, mainWidth, 48, 600);
  ctx.font = `600 ${titleSize}px sans-serif`;
  ctx.fillStyle = themeColor;
  ctx.fillText(titleText, left, top - 34);

  ctx.font = '500 18px monospace';
  ctx.fillStyle = '#D5D2E8';
  ctx.fillText('[ PACKET STATUS: RECOVERED ]', left, top - 2);

  ctx.font = '500 21px monospace';
  const summaryLines = wrapText(ctx, data.summary || '', summaryW - 28);
  drawTextBlock(ctx, summaryLines, summaryX + 14, summaryY + 36, 26, '#FFFFFF', 3);

  ctx.font = '500 18px monospace';
  ctx.fillStyle = '#AAA';
  ctx.fillText('[ ARCHIVE LOG ]', bodyX + 14, bodyY + 24);

  ctx.font = '500 20px monospace';
  const bodyLines = wrapText(ctx, data.body || '', bodyW - 28);
  drawTextBlock(
    ctx,
    bodyLines,
    bodyX + 14,
    bodyY + 58,
    25,
    '#FFFFFF',
    bannerImage ? 4 : 7
  );

  if (data.link) {
    ctx.font = '500 18px monospace';
    ctx.fillStyle = themeColor;
    ctx.fillText('[ UPLINK ]', left, cursorY);

    ctx.font = '500 17px monospace';
    const linkLines = wrapText(ctx, data.link, mainWidth - 8);
    drawTextBlock(ctx, linkLines, left, cursorY + 28, 21, themeColor, 2);
  }

  if (thumbnailImage) {
    const thumbX = left + mainWidth + rightGap;
    const thumbY = summaryY;

    ctx.font = '500 14px monospace';
    ctx.fillStyle = themeColor;
    ctx.fillText('[ VISUAL ]', thumbX + 26, thumbY + 33);
  }

  ctx.font = '500 16px monospace';
  ctx.fillStyle = '#BBB';
  ctx.fillText('JUDGE // TRACE ACTIVE', left, HEIGHT - 30);

  return canvas.toBuffer('image/png');
}