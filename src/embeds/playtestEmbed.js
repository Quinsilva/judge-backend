import { EmbedBuilder } from 'discord.js';

export function playtestEmbed(payload) {
  return new EmbedBuilder()
    .setTitle('QA Playtest Request')
    .setDescription(`Build ${payload.buildVersion} is ready for testing.`)
    .addFields(
      { name: 'Focus Areas', value: payload.focusAreas.slice(0, 1024) },
      { name: 'Testing Window', value: payload.windowText || 'Check with the team for the current testing window.' },
      { name: 'Notes', value: payload.notes?.slice(0, 1024) || 'Report bugs and odd behavior in #alpha-feedback.' }
    )
    .setFooter({ text: 'Judge • Tester Notice' })
    .setTimestamp(new Date());
}
