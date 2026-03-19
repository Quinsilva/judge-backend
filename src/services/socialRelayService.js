import { hasSocialPost, saveSocialPost } from '../repositories/socialRepo.js';
import { publicAnnouncementEmbed } from '../embeds/publicAnnouncementEmbed.js';
import { loadGuildConfig } from './guildConfigService.js';
import { logger } from '../utils/logger.js';

export async function relaySiteUpdate(client, guildId, update) {
  const alreadyPosted = await hasSocialPost(guildId, update.source, update.externalPostId);
  if (alreadyPosted) {
    return null;
  }

  const guildConfig = await loadGuildConfig(guildId);
  const guild = await client.guilds.fetch(guildId);
  const channel = await guild.channels.fetch(guildConfig.channels.announcements?.channelId);

  const message = await channel.send({
    embeds: [
      publicAnnouncementEmbed({
        title: update.title,
        summary: update.summary,
        body: update.body,
        link: update.url
      })
    ]
  });

  await saveSocialPost(guildId, {
    source: update.source,
    externalPostId: update.externalPostId,
    externalUrl: update.url,
    postedChannelId: channel.id,
    discordMessageId: message.id
  });

  logger.info('Relayed site update', guildId, update.externalPostId);
  return message;
}
