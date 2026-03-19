import { EmbedBuilder } from 'discord.js';

export function releaseEmbed(payload) {
  const { version, buildName, status, highlights, knownIssues, callToAction } = payload;
  return new EmbedBuilder()
    .setTitle(`${status.toUpperCase()} Build ${version}`)
    .setDescription(buildName || 'Untitled Run build update')
    .addFields(
      { name: 'Highlights', value: Array.isArray(highlights) ? highlights.map((v) => `- ${v}`).join('\n').slice(0, 1024) : String(highlights || 'None') },
      { name: 'Known Issues', value: Array.isArray(knownIssues) && knownIssues.length ? knownIssues.map((v) => `- ${v}`).join('\n').slice(0, 1024) : 'None listed' },
      { name: 'Next Step', value: callToAction || 'Share feedback in #alpha-feedback.' }
    )
    .setFooter({ text: 'Judge • Release Notice' })
    .setTimestamp(new Date());
}
