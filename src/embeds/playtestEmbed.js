import { EmbedBuilder } from 'discord.js';

export function playtestEmbed(payload) {
  return new EmbedBuilder()
    .setColor(0x9cff8a)
    .setTitle(`Playtest • ${payload.buildVersion}`)
    .setDescription(`Focus Areas: ${payload.focusAreas}`)
    .addFields(
      {
        name: 'Testing Window',
        value: payload.windowText || 'Not specified'
      },
      {
        name: 'Notes',
        value: payload.notes || 'No additional notes.'
      }
    )
    .setFooter({ text: 'UR-Judge System' })
    .setTimestamp();
}