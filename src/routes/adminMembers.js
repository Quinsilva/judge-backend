import express from 'express';
import { requireAdminSession } from './adminAuth.js';
import { firestore } from '../firebase/admin.js';
import { getBotClient } from '../bot/botInstance.js';

const router = express.Router();

router.get('/members', requireAdminSession, async (req, res) => {
  const guildId = String(req.query.guildId || '');
  const q = String(req.query.q || '').trim().toLowerCase();

  if (!guildId) {
    return res.status(400).json({ error: 'guildId is required' });
  }

  try {
    const client = getBotClient();
    const guild = await client.guilds.fetch(guildId);
    await guild.members.fetch();

    const linkSnapshot = await firestore
      .collection('guilds')
      .doc(guildId)
      .collection('memberLinks')
      .get();

    const linkMap = new Map(
      linkSnapshot.docs.map((doc) => [doc.id, { id: doc.id, ...doc.data() }])
    );

    const members = guild.members.cache
      .filter((member) => !member.user.bot)
      .map((member) => {
        const linked = linkMap.get(member.id);

        return {
          id: member.id,
          discordUserId: member.id,
          discordUsername: member.user.username,
          discordDisplayName: member.displayName,
          nickname: member.nickname || '',
          avatarUrl: member.user.displayAvatarURL(),
          linked: Boolean(linked),
          playerDocId: linked?.playerDocId || null,
          approvedMediaCount: linked?.approvedMediaCount ?? 0,
          approvedMediaScore: linked?.approvedMediaScore ?? 0,
          rewardTotals: linked?.rewardTotals ?? {
            gemsAwarded: 0,
            coinsAwarded: 0
          }
        };
      })
      .filter((member) => {
        if (!q) return true;

        return [
          member.discordUsername,
          member.discordDisplayName,
          member.nickname,
          member.playerDocId
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(q));
      })
      .sort((a, b) =>
        (a.discordDisplayName || a.discordUsername).localeCompare(
          b.discordDisplayName || b.discordUsername
        )
      );

    return res.json({ members });
  } catch (error) {
  console.error('GET /admin/members failed:', error);
  return res.status(500).json({
    error: error?.message || 'Failed to fetch members',
    stack: error?.stack || null
  });
}
});

router.get('/members/:discordUserId', requireAdminSession, async (req, res) => {
  const guildId = String(req.query.guildId || '');
  const { discordUserId } = req.params;

  if (!guildId) {
    return res.status(400).json({ error: 'guildId is required' });
  }

  try {
    const client = getBotClient();
    const guild = await client.guilds.fetch(guildId);

    let guildMember = null;
    try {
      guildMember = await guild.members.fetch(discordUserId);
    } catch {
      guildMember = null;
    }

    const linkDoc = await firestore
      .collection('guilds')
      .doc(guildId)
      .collection('memberLinks')
      .doc(discordUserId)
      .get();

    const linked = linkDoc.exists ? linkDoc.data() : null;

    const member = {
      id: discordUserId,
      discordUserId,
      discordUsername: guildMember?.user?.username || linked?.discordUsername || '',
      discordDisplayName: guildMember?.displayName || linked?.discordDisplayName || '',
      nickname: guildMember?.nickname || '',
      avatarUrl: guildMember?.user?.displayAvatarURL?.() || '',
      linked: Boolean(linked),
      playerDocId: linked?.playerDocId || null,
      approvedMediaCount: linked?.approvedMediaCount ?? 0,
      approvedMediaScore: linked?.approvedMediaScore ?? 0,
      rewardTotals: linked?.rewardTotals ?? {
        gemsAwarded: 0,
        coinsAwarded: 0
      }
    };

    return res.json({ member });
  } catch (error) {
  console.error('GET /admin/members/:discordUserId failed:', error);
  return res.status(500).json({
    error: error?.message || 'Failed to fetch member',
    stack: error?.stack || null
  });
}
});

export default router;