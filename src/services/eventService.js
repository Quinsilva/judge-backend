import { eventEmbed } from '../embeds/eventEmbed.js';
import { createEvent, getUpcomingEvents } from '../repositories/eventRepo.js';
import { loadGuildConfig } from './guildConfigService.js';

export async function postEvent(interaction, payload) {
  const guildConfig = await loadGuildConfig(interaction.guildId);
  const channelId = guildConfig.channels.events?.channelId;
  const channel = await interaction.guild.channels.fetch(channelId);
  const message = await channel.send({
    content: payload.mentionRoleId ? `<@&${payload.mentionRoleId}>` : '',
    embeds: [eventEmbed(payload)]
  });

  await createEvent(interaction.guildId, {
    title: payload.title,
    description: payload.description,
    startTime: payload.startTimeIso,
    endTime: payload.endTimeIso || null,
    voiceChannelId: payload.voiceChannelId || null,
    mentionRoleId: payload.mentionRoleId || null,
    targetChannelId: channelId,
    discordMessageId: message.id,
    createdByUserId: interaction.user.id
  });

  return message;
}

export async function listUpcomingEvents(guildId) {
  return getUpcomingEvents(guildId);
}
