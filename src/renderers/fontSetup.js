import { GlobalFonts } from '@napi-rs/canvas';
import fs from 'node:fs';
import path from 'node:path';

/**
 * @napi-rs/canvas uses Skia's font subsystem. Generic family names like
 * "sans-serif" and "monospace" do NOT auto-resolve on all platforms
 * (especially Linux slim containers like node:20-slim).
 *
 * This module resolves a concrete font family at import time and exports
 * FONT_FAMILY / MONO_FAMILY constants for all renderers to use.
 *
 * Priority order:
 *   1. Check if the generic name already resolves (nothing to do).
 *   2. Try to register a concrete system font under the generic alias.
 *   3. Fall back to a concrete family name that Skia already knows about.
 */

const SYSTEM_FONT_PATHS = [
  // Windows
  'C:\\Windows\\Fonts\\arial.ttf',
  'C:\\Windows\\Fonts\\segoeui.ttf',
  'C:\\Windows\\Fonts\\msyh.ttc',
  // Linux (Debian/Ubuntu – matches Dockerfile fonts-dejavu-core)
  '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
  '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
  '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf',
  // macOS
  '/System/Library/Fonts/Helvetica.ttc',
  '/System/Library/Fonts/SFNSDisplay.ttf',
  '/Library/Fonts/Arial.ttf',
];

const PREFERRED_FAMILIES = ['Segoe UI', 'Arial', 'DejaVu Sans', 'Helvetica', 'Liberation Sans'];

let _family = null;

function resolve() {
  // 1. Already available?
  if (GlobalFonts.has('sans-serif')) {
    return 'sans-serif';
  }

  // 2. Register a system font under "sans-serif"
  for (const fontPath of SYSTEM_FONT_PATHS) {
    try {
      if (fs.existsSync(fontPath)) {
        const ok = GlobalFonts.registerFromPath(fontPath, 'sans-serif');
        if (ok) {
          console.log(`[fontSetup] Registered "${fontPath}" as "sans-serif"`);
          return 'sans-serif';
        }
      }
    } catch {
      // ignore per-file errors
    }
  }

  // 3. Find a concrete family that Skia already knows
  const families = GlobalFonts.families.map((f) => f.family);
  for (const candidate of PREFERRED_FAMILIES) {
    if (families.includes(candidate)) {
      console.log(`[fontSetup] "sans-serif" unavailable — using "${candidate}"`);
      return candidate;
    }
  }

  // 4. Last resort: return generic and hope for the best
  console.warn('[fontSetup] No suitable font found. Text may not render.');
  return 'sans-serif';
}

_family = resolve();

export const FONT_FAMILY = _family;

// ── monospace resolution ──────────────────────────────────────────────
const MONO_SYSTEM_PATHS = [
  // Windows
  'C:\\Windows\\Fonts\\consola.ttf',
  'C:\\Windows\\Fonts\\cour.ttf',
  // Linux (Debian/Ubuntu)
  '/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf',
  '/usr/share/fonts/truetype/liberation/LiberationMono-Regular.ttf',
  // macOS
  '/System/Library/Fonts/SFNSMono.ttf',
  '/System/Library/Fonts/Menlo.ttc',
  '/Library/Fonts/Courier New.ttf',
];

const PREFERRED_MONO = ['Consolas', 'Courier New', 'DejaVu Sans Mono', 'Liberation Mono', 'Menlo'];

function resolveMono() {
  if (GlobalFonts.has('monospace')) {
    return 'monospace';
  }

  for (const fontPath of MONO_SYSTEM_PATHS) {
    try {
      if (fs.existsSync(fontPath)) {
        const ok = GlobalFonts.registerFromPath(fontPath, 'monospace');
        if (ok) {
          console.log(`[fontSetup] Registered "${fontPath}" as "monospace"`);
          return 'monospace';
        }
      }
    } catch {
      // ignore
    }
  }

  const families = GlobalFonts.families.map((f) => f.family);
  for (const candidate of PREFERRED_MONO) {
    if (families.includes(candidate)) {
      console.log(`[fontSetup] "monospace" unavailable — using "${candidate}"`);
      return candidate;
    }
  }

  console.warn('[fontSetup] No suitable monospace font found.');
  return 'monospace';
}

export const MONO_FAMILY = resolveMono();
