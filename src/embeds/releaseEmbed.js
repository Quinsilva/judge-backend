import { EmbedBuilder } from 'discord.js';

function statusColor(status) {
  switch (status) {
    case 'stable':
      return 0x57f287;
    case 'hotfix':
      return 0xffa64d;
    case 'dev':
    default:
      return 0x37c8ff;
  }
}

export function releaseEmbed(payload) {
  return new EmbedBuilder()
    .setColor(statusColor(payload.status))
    .setTitle(`Release ${payload.version} • ${payload.buildName}`)
    .setDescription(`Status: ${String(payload.status || '').toUpperCase()}`)
    .addFields(
      {
        name: 'Highlights',
        value: payload.highlights?.length
          ? payload.highlights.map((item) => `• ${item}`).join('\n')
          : 'None'
      },
      {
        name: 'Known Issues',
        value: payload.knownIssues?.length
          ? payload.knownIssues.map((item) => `• ${item}`).join('\n')
          : 'None'
      },
      {
        name: 'Next Step',
        value: payload.callToAction || 'Share feedback in #alpha-feedback.'
      }
    )
    .setFooter({ text: 'UR-Judge System' })
    .setTimestamp();
}