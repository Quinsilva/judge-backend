import express from 'express';
import { requireAdminSession } from './adminAuth.js';
import { createBotClient } from '../bot/client.js';

const router = express.Router();

// reuse a singleton if your app already has one
let cachedClient = null;

function getClient() {
  if (!cachedClient) {
    cachedClient = createBotClient();
  }
  return cachedClient;
}

router.get('/discord-members', requireAdminSession, async (req, res) => {
  const guildId = req.query.guildId;
  if (!guildId) {
    return res.status(400).json({ error: 'guildId is required' });
  }

  try {
    const client = getClient();
    const guild = await client.guilds.fetch(guildId);
    await guild.members.fetch();

    const members = guild.members.cache
      .filter((member) => !member.user.bot)
      .map((member) => ({
        id: member.id,
        discordUserId: member.id,
        discordUsername: member.user.username,
        discordDisplayName: member.displayName,
        nickname: member.nickname || '',
        avatarUrl: member.user.displayAvatarURL(),
      }))
      .sort((a, b) =>
        (a.discordDisplayName || a.discordUsername).localeCompare(
          b.discordDisplayName || b.discordUsername
        )
      );

    return res.json({ members });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Failed to fetch guild members' });
  }
});

export default router;