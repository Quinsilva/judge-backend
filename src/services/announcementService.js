import { publicAnnouncementEmbed } from '../embeds/publicAnnouncementEmbed.js';
import { loadGuildConfig } from './guildConfigService.js';

export async function postAnnouncement(interaction, payload) {
  const guildConfig = await loadGuildConfig(interaction.guildId);
  const defaultChannelId = guildConfig.channels.announcements?.channelId;
  const targetChannelId = payload.targetChannelId || defaultChannelId;
  const channel = await interaction.guild.channels.fetch(targetChannelId);
  const embed = publicAnnouncementEmbed(payload);

  const content = payload.mentionRoleId ? `<@&${payload.mentionRoleId}>` : '';
  const message = await channel.send({ content, embeds: [embed] });
  return message;
}
