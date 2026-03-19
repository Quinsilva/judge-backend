import { EmbedBuilder } from 'discord.js';

export function eventEmbed(payload) {
  return new EmbedBuilder()
    .setTitle(payload.title)
    .setDescription(payload.description)
    .addFields(
      { name: 'Start', value: payload.startTimeText },
      { name: 'End', value: payload.endTimeText || 'TBD' },
      { name: 'Voice Channel', value: payload.voiceChannelName || 'Check #events for details.' }
    )
    .setFooter({ text: 'Judge • Event Notice' })
    .setTimestamp(new Date(payload.startTimeIso));
}
