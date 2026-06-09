/**
 * Local card rendering test — generates all card types and saves them
 * to ./test-cards/ for visual inspection.
 *
 * Usage:
 *   node scripts/test-cards.js
 *
 * No Discord connection or env vars required (only @napi-rs/canvas + assets).
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const OUT_DIR = path.join(__dirname, '..', 'test-cards');

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  // ── Release Card ──────────────────────────────────────────────────
  const { renderReleaseCard } = await import('../src/renderers/renderReleaseCard.js');
  const releaseBuf = await renderReleaseCard({
    version: '0.4.2',
    buildName: 'Midnight Drift',
    status: 'dev',
    highlights: [
      'New gravity flip mechanic',
      'Updated checkpoint system',
      'Performance pass on lighting'
    ],
    knownIssues: [
      'Particle flicker on low settings',
      'Pause menu overlap in ultrawide'
    ],
    callToAction: 'Share feedback in #alpha-feedback.'
  });
  fs.writeFileSync(path.join(OUT_DIR, 'release-card.png'), releaseBuf);
  console.log(`✓ release-card.png  (${(releaseBuf.length / 1024).toFixed(0)} KB)`);

  // ── Playtest Card ─────────────────────────────────────────────────
  const { renderPlaytestCard } = await import('../src/renderers/renderPlaytestCard.js');
  const playtestBuf = await renderPlaytestCard({
    buildVersion: '0.4.2-dev',
    focusAreas: 'Gravity flip, checkpoint flow, lighting perf',
    windowText: 'Today 6 PM – 9 PM UTC',
    notes: 'Focus on levels 3-5. Report any softlocks.'
  });
  fs.writeFileSync(path.join(OUT_DIR, 'playtest-card.png'), playtestBuf);
  console.log(`✓ playtest-card.png  (${(playtestBuf.length / 1024).toFixed(0)} KB)`);

  // ── Announcement Card ─────────────────────────────────────────────
  const { renderAnnouncementCard } = await import('../src/renderers/renderAnnouncementCard.js');
  const announceBuf = await renderAnnouncementCard({
    title: 'Midnight Drift Update',
    summary: 'A major content update introducing the gravity flip mechanic and redesigned checkpoints.',
    body: 'The team has been working hard on a complete overhaul of the physics system. The new gravity flip adds a fresh dimension to gameplay. Checkpoints now support mid-air respawns. Lighting has been optimized for older GPUs.',
    link: 'https://untitledrun.web.app/patch-notes/0.4.2',
    theme: 'cyan',
    image: null,
    thumbnail: null
  });
  fs.writeFileSync(path.join(OUT_DIR, 'announcement-card.png'), announceBuf);
  console.log(`✓ announcement-card.png  (${(announceBuf.length / 1024).toFixed(0)} KB)`);

  // ── Event Reminder Note ───────────────────────────────────────────
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
    thumbnailUrl: null
  });
  fs.writeFileSync(path.join(OUT_DIR, 'event-reminder.png'), reminderBuf);
  console.log(`✓ event-reminder.png  (${(reminderBuf.length / 1024).toFixed(0)} KB)`);

  // ── Event Card ────────────────────────────────────────────────────
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
      thumbnailUrl: null
    });
    fs.writeFileSync(path.join(OUT_DIR, 'event-card.png'), eventBuf);
    console.log(`✓ event-card.png  (${(eventBuf.length / 1024).toFixed(0)} KB)`);
  } catch (err) {
    console.log(`✗ event-card.png  (${err.message})`);
  }

  console.log(`\nDone. Open the images in: ${OUT_DIR}`);
}

main().catch((err) => {
  console.error('Card test failed:', err);
  process.exit(1);
});
