import { EmbedBuilder } from 'discord.js';

export function publicAnnouncementEmbed({ title, summary, body, link }) {
  const embed = new EmbedBuilder()
    .setTitle(title)
    .setDescription(summary)
    .addFields({ name: 'Details', value: body.slice(0, 1024) })
    .setFooter({ text: 'Judge • Official Untitled Run Update' })
    .setTimestamp(new Date());

  if (link) {
    embed.addFields({ name: 'Link', value: link });
  }

  return embed;
}
