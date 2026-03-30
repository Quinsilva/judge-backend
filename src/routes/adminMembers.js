import express from 'express';
import { requireAdminSession } from './adminAuth.js';
import { firestore } from '../firebase/admin.js';
import { getBotClient } from '../bot/botInstance.js';

const router = express.Router();

const memberCache = new Map();
const CACHE_TTL_MS = 60 * 1000;

async function getGuildMembersCached(guild) {
  const cached = memberCache.get(guild.id);
  const now = Date.now();

  if (cached && now - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.members;
  }

  // Only fetch if cache is empty or stale
  const fetchedMembers = await guild.members.fetch();

  memberCache.set(guild.id, {
    fetchedAt: now,
    members: fetchedMembers
  });

  return fetchedMembers;
}

router.get('/members', requireAdminSession, async (req, res) => {
  const guildId = String(req.query.guildId || '');
  const q = String(req.query.q || '').trim().toLowerCase();

  if (!guildId) {
    return res.status(400).json({ error: 'guildId is required' });
  }

  try {
    const client = getBotClient();

    if (!client || !client.isReady()) {
      return res.status(503).json({ error: 'Bot client is not ready yet' });
    }

    let guild = client.guilds.cache.get(guildId);
    if (!guild) {
      guild = await client.guilds.fetch(guildId);
    }

    const fetchedMembers = await getGuildMembersCached(guild);

    let linkSnapshot;
    try {
      linkSnapshot = await firestore
        .collection('guilds')
        .doc(guildId)
        .collection('memberLinks')
        .get();
    } catch (firestoreError) {
      console.error('[members] Firestore read failed:', firestoreError);
      linkSnapshot = { docs: [] };
    }

    const linkMap = new Map(
      linkSnapshot.docs.map((doc) => [doc.id, { id: doc.id, ...doc.data() }])
    );

    const members = fetchedMembers
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
    console.error('[members] failed:', error);
    return res.status(500).json({
      error: error?.message || 'Failed to fetch members'
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

    if (!client || !client.isReady()) {
      return res.status(503).json({ error: 'Bot client is not ready yet' });
    }

    let guild = client.guilds.cache.get(guildId);
    if (!guild) {
      guild = await client.guilds.fetch(guildId);
    }

    let guildMember = guild.members.cache.get(discordUserId);
    if (!guildMember) {
      guildMember = await guild.members.fetch(discordUserId);
    }

    let linked = null;
    try {
      const linkDoc = await firestore
        .collection('guilds')
        .doc(guildId)
        .collection('memberLinks')
        .doc(discordUserId)
        .get();

      linked = linkDoc.exists ? linkDoc.data() : null;
    } catch (firestoreError) {
      console.error('[member detail] Firestore read failed:', firestoreError);
    }

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
    console.error('[member detail] failed:', error);
    return res.status(500).json({
      error: error?.message || 'Failed to fetch member'
    });
  }
});

export default router;