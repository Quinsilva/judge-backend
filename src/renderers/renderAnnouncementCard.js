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
    ctx.font = `600 ${size}px ${family}`;
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

function roundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
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
    ctx.fillStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},${0.18 + Math.random() * 0.25})`;
    ctx.fillRect(
      Math.random() * WIDTH,
      Math.random() * HEIGHT,
      12 + Math.random() * 34,
      2 + Math.random() * 4
    );
  }

  ctx.restore();
}

function drawPanel(ctx, x, y, w, h, themeColor, fillAlpha = 0.82) {
  const rgb = hexToRgb(themeColor);

  ctx.save();
  ctx.fillStyle = `rgba(8, 10, 16, ${fillAlpha})`;
  roundedRect(ctx, x, y, w, h, 12);
  ctx.fill();

  ctx.strokeStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},0.38)`;
  ctx.lineWidth = 1.5;
  roundedRect(ctx, x, y, w, h, 12);
  ctx.stroke();
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

function drawContainImage(ctx, image, x, y, w, h, radius = 10) {
  ctx.save();
  clipRoundedRect(ctx, x, y, w, h, radius);

  ctx.fillStyle = 'rgba(0,0,0,0.18)';
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

function beginTextLayer(ctx) {
  ctx.save();
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  ctx.shadowBlur = 0;
  ctx.shadowColor = 'transparent';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}

function endTextLayer(ctx) {
  ctx.restore();
}

function drawTextBlock(ctx, lines, x, y, lineHeight, color, maxLines) {
  beginTextLayer(ctx);
  ctx.fillStyle = color;
  for (let i = 0; i < Math.min(lines.length, maxLines); i += 1) {
    ctx.fillText(lines[i], x, y + i * lineHeight);
  }
  endTextLayer(ctx);
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

  // Background
  ctx.drawImage(bg, 0, 0, WIDTH, HEIGHT);

  // Dark overlay + tint
  ctx.fillStyle = 'rgba(0,0,0,0.65)';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.fillStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},0.10)`;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  drawScanlines(ctx);
  drawNoiseBars(ctx, themeColor);

  // Frame stays behind content
  ctx.drawImage(frame, 0, 0, WIDTH, HEIGHT);

  // Layout
  const left = 110;
  const top = 110;

  const thumbColumnW = thumbnailImage ? 250 : 0;
  const gap = thumbnailImage ? 26 : 0;
  const mainW = WIDTH - 220 - thumbColumnW - gap;

  const titleY = top - 30;
  const statusY = top;
  const summaryPanelY = top + 20;
  const summaryPanelH = 100;

  const bodyPanelY = summaryPanelY + summaryPanelH + 22;
  const bodyPanelH = 200;

  const bannerPanelY = bodyPanelY + bodyPanelH + 20;
  const bannerPanelH = bannerImage ? 95 : 0;

  // Panels and images first
  drawPanel(ctx, left, summaryPanelY, mainW, summaryPanelH, themeColor, 0.74);
  drawPanel(ctx, left, bodyPanelY, mainW, bodyPanelH, themeColor, 0.82);

  if (bannerImage) {
    drawPanel(ctx, left, bannerPanelY, mainW, bannerPanelH, themeColor, 0.86);
    drawContainImage(ctx, bannerImage, left + 10, bannerPanelY + 10, mainW - 20, bannerPanelH - 20, 10);
  }

  if (thumbnailImage) {
    const thumbX = left + mainW + gap;
    const thumbY = summaryPanelY;
    const thumbH = 300;

    drawPanel(ctx, thumbX, thumbY, thumbColumnW, thumbH, themeColor, 0.84);

    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    roundedRect(ctx, thumbX + 14, thumbY + 14, 112, 28, 8);
    ctx.fill();
    ctx.restore();

    drawContainImage(
      ctx,
      thumbnailImage,
      thumbX + 14,
      thumbY + 54,
      thumbColumnW - 28,
      thumbH - 68,
      10
    );
  }

  // Divider
  ctx.save();
  ctx.strokeStyle = themeColor;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(left, summaryPanelY - 8);
  ctx.lineTo(left + mainW - 10, summaryPanelY - 8);
  ctx.stroke();
  ctx.restore();

  // Text last, in a clean state every time
  const titleText = String(data.title || 'ANNOUNCEMENT').toUpperCase();

  beginTextLayer(ctx);
  const titleSize = fitText(ctx, titleText, mainW, 48);
  ctx.font = `600 ${titleSize}px sans-serif`;
  ctx.fillStyle = themeColor;
  ctx.fillText(titleText, left, titleY);
  endTextLayer(ctx);

  beginTextLayer(ctx);
  ctx.font = '500 18px monospace';
  ctx.fillStyle = '#D5D2E8';
  ctx.fillText('[ PACKET STATUS: RECOVERED ]', left, statusY);
  endTextLayer(ctx);

  beginTextLayer(ctx);
  ctx.font = '500 21px monospace';
  const summaryLines = wrapText(ctx, data.summary || '', mainW - 28);
  drawTextBlock(ctx, summaryLines, left + 14, summaryPanelY + 34, 26, '#FFFFFF', 3);
  endTextLayer(ctx);

  beginTextLayer(ctx);
  ctx.font = '500 18px monospace';
  ctx.fillStyle = '#AAA';
  ctx.fillText('[ ARCHIVE LOG ]', left + 14, bodyPanelY + 24);
  endTextLayer(ctx);

  beginTextLayer(ctx);
  ctx.font = '500 20px monospace';
  const bodyLines = wrapText(ctx, data.body || '', mainW - 28);
  drawTextBlock(ctx, bodyLines, left + 14, bodyPanelY + 58, 25, '#FFFFFF', 5);
  endTextLayer(ctx);

  if (data.link) {
    const linkY = bannerImage ? bannerPanelY + bannerPanelH + 26 : bodyPanelY + bodyPanelH + 26;

    beginTextLayer(ctx);
    ctx.font = '500 18px monospace';
    ctx.fillStyle = themeColor;
    ctx.fillText('[ UPLINK ]', left, linkY);
    endTextLayer(ctx);

    beginTextLayer(ctx);
    ctx.font = '500 17px monospace';
    const linkLines = wrapText(ctx, data.link, mainW - 8);
    drawTextBlock(ctx, linkLines, left, linkY + 26, 21, themeColor, 2);
    endTextLayer(ctx);
  }

  if (thumbnailImage) {
    const thumbX = left + mainW + gap;
    const thumbY = summaryPanelY;

    beginTextLayer(ctx);
    ctx.font = '500 14px monospace';
    ctx.fillStyle = themeColor;
    ctx.fillText('[ VISUAL ]', thumbX + 26, thumbY + 33);
    endTextLayer(ctx);
  }

  beginTextLayer(ctx);
  ctx.font = '500 16px monospace';
  ctx.fillStyle = '#BBB';
  ctx.fillText('JUDGE // TRACE ACTIVE', left, HEIGHT - 30);
  endTextLayer(ctx);

  return canvas.toBuffer('image/png');
}