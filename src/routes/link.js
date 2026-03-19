import express from 'express';
import { firestore } from '../firebase/admin.js';

const router = express.Router();

router.post('/complete', async (req, res) => {
  try {
    const { token, playerId } = req.body;

    const doc = await firestore.collection('linkTokens').doc(token).get();

    if (!doc.exists) {
      return res.status(400).json({ error: 'Invalid token' });
    }

    const data = doc.data();

    if (data.used) {
      return res.status(400).json({ error: 'Already used' });
    }

    if (data.expiresAt < Date.now()) {
      return res.status(400).json({ error: 'Expired' });
    }

    await firestore.collection('URPlayer').doc(playerId).set({
      discordId: data.discordUserId
    }, { merge: true });

    await doc.ref.update({ used: true });

    return res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to link account' });
  }
});

export default router;