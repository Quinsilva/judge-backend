import express from 'express';
import { requireAdminSession } from './adminAuth.js';
import { firestore } from '../firebase/admin.js';

const router = express.Router();

router.get('/rewards/config', requireAdminSession, async (req, res) => {
  const guildId = req.query.guildId;
  if (!guildId) {
    return res.status(400).json({ error: 'guildId is required' });
  }

  const doc = await firestore
    .collection('guilds')
    .doc(guildId)
    .collection('settings')
    .doc('rewards')
    .get();

  return res.json({
    config: doc.exists ? doc.data() : { approvedChannels: [], milestones: [] }
  });
});

router.put('/rewards/config', requireAdminSession, async (req, res) => {
  const { guildId, approvedChannels, milestones } = req.body ?? {};

  if (!guildId) {
    return res.status(400).json({ error: 'guildId is required' });
  }

  await firestore
    .collection('guilds')
    .doc(guildId)
    .collection('settings')
    .doc('rewards')
    .set(
      {
        approvedChannels: approvedChannels ?? [],
        milestones: milestones ?? [],
        updatedAt: new Date().toISOString()
      },
      { merge: true }
    );

  return res.json({ ok: true });
});

export default router;