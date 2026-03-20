import express from 'express';
import { firestore } from '../firebase/admin.js';
import { requireAdminSession } from './adminAuth.js';
import { getBotClient } from '../bot/botInstance.js';

const router = express.Router();

router.get('/submissions', requireAdminSession, async (req, res) => {
  const guildId = String(req.query.guildId || '');

  if (!guildId) {
    return res.status(400).json({ error: 'guildId is required' });
  }

  try {
    const snapshot = await firestore
      .collection('guilds')
      .doc(guildId)
      .collection('mediaSubmissions')
      .where('status', '==', 'pending')
      .get();

    const submissions = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data()
    }));

    return res.json({ submissions });
  } catch (error) {
    console.error('GET /admin/submissions failed', error);
    return res.status(500).json({ error: 'Failed to load submissions' });
  }
});

router.post('/submissions/:submissionId/approve', requireAdminSession, async (req, res) => {
  const guildId = String(req.body.guildId || '');
  const { submissionId } = req.params;
  const rewardDecision = req.body.rewardDecision || {};

  if (!guildId) {
    return res.status(400).json({ error: 'guildId is required' });
  }

  const gems = Number(rewardDecision.gems || 0);
  const coins = Number(rewardDecision.coins || 0);
  const score = Number(rewardDecision.score || 1);

  try {
    const submissionRef = firestore
      .collection('guilds')
      .doc(guildId)
      .collection('mediaSubmissions')
      .doc(submissionId);

    const submissionSnap = await submissionRef.get();

    if (!submissionSnap.exists) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    const submission = submissionSnap.data();

    if (submission.status === 'approved') {
      return res.status(400).json({ error: 'Submission is already approved' });
    }

    const memberLinkRef = firestore
      .collection('guilds')
      .doc(guildId)
      .collection('memberLinks')
      .doc(submission.discordUserId);

    const memberLinkSnap = await memberLinkRef.get();
    const memberLinkData = memberLinkSnap.exists ? memberLinkSnap.data() : {};

    const now = Date.now();
    const batch = firestore.batch();

    batch.set(
      submissionRef,
      {
        status: 'approved',
        reviewedAt: now,
        reviewedBy: 'admin-dashboard',
        reviewDecision: 'approved',
        rewardDecision: {
          gems,
          coins,
          score
        }
      },
      { merge: true }
    );

    batch.set(
      memberLinkRef,
      {
        discordUserId: submission.discordUserId,
        discordUsername: submission.discordUsername,
        discordDisplayName: submission.discordDisplayName || submission.discordUsername,
        playerDocId: memberLinkData.playerDocId || null,
        linked: memberLinkData.linked || false,
        approvedMediaCount: Number(memberLinkData.approvedMediaCount || 0) + 1,
        approvedMediaScore: Number(memberLinkData.approvedMediaScore || 0) + score,
        rewardTotals: {
          gemsAwarded: Number(memberLinkData?.rewardTotals?.gemsAwarded || 0) + gems,
          coinsAwarded: Number(memberLinkData?.rewardTotals?.coinsAwarded || 0) + coins
        },
        updatedAt: now
      },
      { merge: true }
    );

    await batch.commit();

    return res.json({
      ok: true,
      submission: {
        ...submission,
        status: 'approved',
        rewardDecision: { gems, coins, score }
      }
    });
  } catch (error) {
    console.error('Approve submission failed', error);
    return res.status(500).json({ error: 'Failed to approve submission' });
  }
});

router.post('/submissions/:submissionId/reject', requireAdminSession, async (req, res) => {
  const guildId = String(req.body.guildId || '');
  const { submissionId } = req.params;

  if (!guildId) {
    return res.status(400).json({ error: 'guildId is required' });
  }

  try {
    const ref = firestore
      .collection('guilds')
      .doc(guildId)
      .collection('mediaSubmissions')
      .doc(submissionId);

    const snap = await ref.get();

    if (!snap.exists) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    const submission = snap.data();
    const now = Date.now();

    const client = getBotClient();
    const guild = await client.guilds.fetch(guildId);
    const channel = await guild.channels.fetch(submission.channelId);

    if (!channel || !channel.isTextBased()) {
      return res.status(400).json({ error: 'Submission channel not found or not text-based' });
    }

    try {
      const originalMessage = await channel.messages.fetch(submission.messageId);
      await originalMessage.delete().catch(() => null);
    } catch {
      // ignore if already deleted
    }

    await channel.send(
      `${submission.discordDisplayName || submission.discordUsername} Submission Dismissed`
    );

    await ref.set(
      {
        status: 'rejected',
        reviewedAt: now,
        reviewedBy: 'admin-dashboard',
        reviewDecision: 'rejected'
      },
      { merge: true }
    );

    return res.json({ ok: true, submission });
  } catch (error) {
    console.error('Reject submission failed', error);
    return res.status(500).json({ error: 'Failed to reject submission' });
  }
});

export default router;