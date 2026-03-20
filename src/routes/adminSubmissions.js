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