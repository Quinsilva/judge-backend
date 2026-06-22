/**
 * Card rendering test — generates all card types, validates text rendering,
 * and saves images to ./test-cards/ for visual inspection.
 *
 * Detects the "missing text" failure mode where @napi-rs/canvas (Skia)
 * silently renders no glyphs when a font family doesn't resolve.
 *
 * Flow:
 *   1. Generate every card PNG (this triggers each renderer's font registration)
 *   2. Probe whether text actually rendered (scan alpha pixels)
 *   3. Report PASS/WARN/FAIL with a non-zero exit on failure
 *
 * Usage:
 *   npm run test-cards                  # generate + validate
 *   node scripts/test-cards.js          # same
 *
 * Exit codes:
 *   0 — all cards + text probes PASS
 *   1 — at least one probe or card WARN/FAIL
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCanvas } from '@napi-rs/canvas';

/* ── Setup ─────────────────────────────────────────────────────────── */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const OUT_DIR = path.join(__dirname, '..', 'test-cards');
const PROBE_W = 200;
const PROBE_H = 80;

let allPass = true;
const results = [];   // collected lines, printed in order at the end

function pass(label, detail = '') {
  results.push(`  ✓ ${label}${detail ? `  ${detail}` : ''}`);
}
function warn(label, detail = '') {
  allPass = false;
  results.push(`  ⚠ ${label}${detail ? `  ${detail}` : ''}`);
}
function fail(label, detail = '') {
  allPass = false;
  results.push(`  ✗ ${label}${detail ? `  ${detail}` : ''}`);
}
function heading(text) {
  results.push(`\n━━━ ${text} ━━━`);
}

/* ── Font Render Probe ────────────────────────────────────────────── */

/**
 * Draw a test string on a tiny transparent canvas and scan the alpha channel.
 * Zero non-transparent pixels => the font family didn't resolve and Skia
 * drew nothing. This is the exact "missing text" failure mode.
 */
function probeFont(family, weight, size, label) {
  const canvas = createCanvas(PROBE_W, PROBE_H);
  const ctx = canvas.getContext('2d');

  ctx.font = `${weight} ${size}px ${family}`;
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('ABCDabcd1234!@#$ The quick brown fox', 10, 50);

  const data = ctx.getImageData(0, 0, PROBE_W, PROBE_H).data;
  const total = PROBE_W * PROBE_H;
  let lit = 0;
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] > 0) lit++;
  }

  const pct = ((lit / total) * 100).toFixed(1);
  if (lit > 0) {
    pass(`${label} (${family})`, `→ ${lit} lit px (${pct}%)`);
    return true;
  }
  fail(`${label} (${family})`, `→ 0 lit px — TEXT WILL NOT RENDER`);
  return false;
}

/* ── PNG validation ───────────────────────────────────────────────── */

function validateCardPng(buf, name) {
  if (!buf || buf.length < 100) {
    fail(name, 'buffer too small or empty');
    return;
  }
  const pngSig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  if (!buf.slice(0, 8).equals(pngSig)) {
    fail(name, 'not a valid PNG');
    return;
  }
  pass(name, `${(buf.length / 1024).toFixed(0)} KB — valid PNG`);
}

/* ── Main ─────────────────────────────────────────────────────────── */

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  // Import the shared font constants (triggers resolve() at import time)
  const fontSetup = await import('../src/renderers/fontSetup.js');

  /* ── 1. Generate every card (triggers each renderer's font setup) ── */
  heading('Card Generation');

  // ── Release Card ───────────────────────────────────────────────────
  const { renderReleaseCard } = await import('../src/renderers/renderReleaseCard.js');
  const releaseBuf = await renderReleaseCard({
    version: '0.4.2',
    buildName: 'Midnight Drift',
    status: 'dev',
    highlights: [
      'New gravity flip mechanic',
      'Updated checkpoint system',
      'Performance pass on lighting',
    ],
    knownIssues: [
      'Particle flicker on low settings',
      'Pause menu overlap in ultrawide',
    ],
    callToAction: 'Share feedback in #alpha-feedback.',
  });
  fs.writeFileSync(path.join(OUT_DIR, 'release-card.png'), releaseBuf);
  validateCardPng(releaseBuf, 'release-card.png');

  // ── Playtest Card ──────────────────────────────────────────────────
  const { renderPlaytestCard } = await import('../src/renderers/renderPlaytestCard.js');
  const playtestBuf = await renderPlaytestCard({
    buildVersion: '0.4.2-dev',
    focusAreas: 'Gravity flip, checkpoint flow, lighting perf',
    windowText: 'Today 6 PM – 9 PM UTC',
    notes: 'Focus on levels 3-5. Report any softlocks.',
  });
  fs.writeFileSync(path.join(OUT_DIR, 'playtest-card.png'), playtestBuf);
  validateCardPng(playtestBuf, 'playtest-card.png');

  // ── Announcement Card ──────────────────────────────────────────────
  const { renderAnnouncementCard } = await import('../src/renderers/renderAnnouncementCard.js');
  const announceBuf = await renderAnnouncementCard({
    title: 'Midnight Drift Update',
    summary: 'A major content update introducing the gravity flip mechanic and redesigned checkpoints.',
    body: 'The team has been working hard on a complete overhaul of the physics system. The new gravity flip adds a fresh dimension to gameplay. Checkpoints now support mid-air respawns. Lighting has been optimized for older GPUs.',
    link: 'https://untitledrun.web.app/patch-notes/0.4.2',
    theme: 'cyan',
    image: null,
    thumbnail: null,
  });
  fs.writeFileSync(path.join(OUT_DIR, 'announcement-card.png'), announceBuf);
  validateCardPng(announceBuf, 'announcement-card.png');

  // ── Event Reminder Note ────────────────────────────────────────────
  const { renderEventReminderNote } = await import('../src/renderers/renderEventReminderNote.js');
  const reminderBuf = await renderEventReminderNote({
    title: 'Community Playtest Night',
    description: 'Join us for a community playtest of the latest dev build. All skill levels welcome!',
    minutesBefore: 15,
    theme: 'cyan',
    startDateText: '2025-07-20',
    startTimeText: '18:00',
    endDateText: '2025-07-20',
    endTimeText: '21:00',
    timezone: 'UTC',
    voiceChannelName: 'Playtest Lobby',
    imageUrl: null,
    thumbnailUrl: null,
  });
  fs.writeFileSync(path.join(OUT_DIR, 'event-reminder.png'), reminderBuf);
  validateCardPng(reminderBuf, 'event-reminder.png');

  // ── Event Card (uses shared FONT_FAMILY/MONO_FAMILY from fontSetup) ─
  try {
    const { renderEventCard } = await import('../src/renderers/renderEventCard.js');
    const eventBuf = await renderEventCard({
      title: 'Community Playtest Night',
      description: 'Join us for a community playtest of the latest dev build. All skill levels welcome!',
      theme: 'cyan',
      startDateText: '2025-07-20',
      startTimeText: '18:00',
      endDateText: '2025-07-20',
      endTimeText: '21:00',
      timezone: 'UTC',
      voiceChannelName: 'Playtest Lobby',
      imageUrl: null,
      thumbnailUrl: null,
    });
    fs.writeFileSync(path.join(OUT_DIR, 'event-card.png'), eventBuf);
    validateCardPng(eventBuf, 'event-card.png');
  } catch (err) {
    fail('event-card.png', err.message);
  }

  /* ── 2. Font diagnostics ─────────────────────────────────────────── */
  heading('Font Diagnostics');
  console.log(`  FONT_FAMILY  = ${fontSetup.FONT_FAMILY}`);
  console.log(`  MONO_FAMILY  = ${fontSetup.MONO_FAMILY}`);

  // Verify the bundled font files exist on disk (the critical path on
  // every platform — if these are missing, rendering degrades silently).
  const FONT_DIR = path.join(__dirname, '..', 'src', 'assets', 'fonts');
  for (const f of ['DejaVuSans.ttf', 'DejaVuSans-Bold.ttf', 'DejaVuSansMono.ttf', 'DejaVuSansMono-Bold.ttf']) {
    const p = path.join(FONT_DIR, f);
    if (fs.existsSync(p)) {
      pass(`bundled ${f}`, `${(fs.statSync(p).size / 1024).toFixed(0)} KB`);
    } else {
      fail(`bundled ${f}`, 'MISSING — will fall back to system fonts or show no text');
    }
  }

  /* ── 3. Probe both families (covers ALL cards incl. event) ───────── */
  heading('Font Render Probe (all cards)');
  probeFont(fontSetup.FONT_FAMILY, '800', 40, 'FONT_FAMILY (sans)');
  probeFont(fontSetup.MONO_FAMILY, '500', 30, 'MONO_FAMILY (mono)');

  /* ── 5. Summary ──────────────────────────────────────────────────── */
  heading('Summary');
  const total = results.filter((l) => /^\s+[✓⚠✗]/.test(l)).length;
  const passed = results.filter((l) => /^\s+✓/.test(l)).length;
  const failed = results.filter((l) => /^\s+[⚠✗]/.test(l)).length;

  for (const line of results) console.log(line);

  console.log(`\n━━━ RESULT ━━━`);
  console.log(`  Checks: ${total}   Passed: ${passed}   Issues: ${failed}`);
  console.log(`  Images: ${OUT_DIR.replace(/\\/g, '/')}`);

  if (failed > 0) {
    console.log(`\n  ⚠  ISSUES DETECTED. See "✗"/"⚠" marks above.`);
    console.log(`     "0 lit px" or "NOT REGISTERED" => cards will have NO visible text.`);
    console.log(`     Verify the font paths in fontSetup.js / renderEventCard.js`);
    console.log(`     exist on this machine.\n`);
  } else {
    console.log(`\n  ✅ All probes and cards PASS — text is rendering correctly.\n`);
  }

  process.exit(allPass ? 0 : 1);
}

main().catch((err) => {
  console.error('Card test failed:', err);
  process.exit(1);
});
