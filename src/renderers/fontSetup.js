import { GlobalFonts } from '@napi-rs/canvas';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Bundled-font registration for @napi-rs/canvas (Skia).
 *
 * WHY BUNDLED FONTS
 *   Generic CSS family names like "sans-serif" / "monospace" do NOT
 *   auto-resolve on all platforms (notably node:20-slim Linux images).
 *   When that happens Skia silently renders ZERO glyphs — cards come out
 *   with graphics but NO text. Bundling the TTFs in the repo guarantees
 *   identical rendering on Windows, macOS, CI, and Docker with zero
 *   dependence on which OS fonts happen to be installed.
 *
 * The DejaVu fonts are used because they are already the project default,
 * freely redistributable, and have excellent glyph coverage
 * (• ✦ ⚠ 📣 → box-drawing, etc.).
 *
 * Families registered:
 *   "DejaVuSans"     <- DejaVuSans.ttf (400) + DejaVuSans-Bold.ttf (700)
 *   "DejaVuSansMono" <- DejaVuSansMono.ttf (400) + DejaVuSansMono-Bold.ttf (700)
 *
 * NOTE: the alias has no spaces on purpose — renderers build font strings
 * as `800 ${size}px ${FONT_FAMILY}` without quoting, which only works for
 * single-token family names.
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FONT_DIR = path.join(__dirname, '..', 'assets', 'fonts');

// Concrete alias names used by every renderer.
export const FONT_FAMILY = 'DejaVuSans';
export const MONO_FAMILY = 'DejaVuSansMono';

// Bundled files: [path, alias] — regular + bold registered under one alias
// so Skia can select the bold face by font weight.
const BUNDLED = [
  ['DejaVuSans.ttf', FONT_FAMILY],
  ['DejaVuSans-Bold.ttf', FONT_FAMILY],
  ['DejaVuSansMono.ttf', MONO_FAMILY],
  ['DejaVuSansMono-Bold.ttf', MONO_FAMILY],
];

// System-path fallbacks, used ONLY if the bundled files are missing
// (e.g. the repo was cloned without LFS / fonts dir stripped).
const SANS_FALLBACK = [
  'C:\\Windows\\Fonts\\arial.ttf',
  '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
  '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf',
  '/System/Library/Fonts/Helvetica.ttc',
];
const MONO_FALLBACK = [
  'C:\\Windows\\Fonts\\consola.ttf',
  '/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf',
  '/usr/share/fonts/truetype/liberation/LiberationMono-Regular.ttf',
  '/System/Library/Fonts/Menlo.ttc',
];

let _registered = false;

function registerOne(fontPath, alias) {
  try {
    if (!fs.existsSync(fontPath)) return false;
    const ok = GlobalFonts.registerFromPath(fontPath, alias);
    if (ok) {
      console.log(`[fontSetup] Registered "${path.basename(fontPath)}" as "${alias}"`);
      return true;
    }
  } catch {
    // ignore per-file errors
  }
  return false;
}

function registerAll() {
  if (_registered) return;
  _registered = true;

  // 1. Bundled fonts (primary, deterministic across all environments)
  let sansOk = false;
  let monoOk = false;
  for (const [file, alias] of BUNDLED) {
    if (registerOne(path.join(FONT_DIR, file), alias)) {
      if (alias === FONT_FAMILY) sansOk = true;
      if (alias === MONO_FAMILY) monoOk = true;
    }
  }

  // 2. System-path fallback if a bundled family is incomplete
  if (!sansOk) {
    console.warn('[fontSetup] Bundled sans font missing — trying system fallback.');
    for (const p of SANS_FALLBACK) {
      if (registerOne(p, FONT_FAMILY)) break;
    }
  }
  if (!monoOk) {
    console.warn('[fontSetup] Bundled mono font missing — trying system fallback.');
    for (const p of MONO_FALLBACK) {
      if (registerOne(p, MONO_FAMILY)) break;
    }
  }

  if (!GlobalFonts.has(FONT_FAMILY)) {
    console.error(`[fontSetup] FATAL: "${FONT_FAMILY}" did not register. Text will NOT render.`);
  }
  if (!GlobalFonts.has(MONO_FAMILY)) {
    console.error(`[fontSetup] FATAL: "${MONO_FAMILY}" did not register. Text will NOT render.`);
  }
}

// Register synchronously at import time so FONT_FAMILY/MONO_FAMILY are
// immediately usable by any renderer that imports this module.
registerAll();
