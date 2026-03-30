import { EmbedBuilder } from 'discord.js';

function clip(text = '', max = 1024) {
  return text.length > max ? text.slice(0, max - 3) + '...' : text;
}

export function publicAnnouncementEmbed({
  title,
  summary,
  body,
  link,
  image,
  thumbnail,
}) {
  const embed = new EmbedBuilder()
    .setColor(0xff003c)
    .setTitle(`⟦ ${title.toUpperCase()} ⟧`)
    .setDescription(
      `> **PACKET RECOVERED**\n> ${clip(summary, 250)}`
    )
    .addFields(
      {
        name: 'ERROR::TRACE_LOG',
        value: `\`\`\`${clip(body, 950)}\`\`\``,
      },
      link
        ? {
            name: 'NODE::LINK',
            value: `[ENTER CHANNEL](${link})`,
          }
        : {
            name: '\u200B',
            value: '\u200B',
          }
    )
    .setFooter({
      text: 'JUDGE • RESTRICTED ARCHIVE • SIGNAL INTEGRITY 12%',
    })
    .setTimestamp();

  if (thumbnail) embed.setThumbnail(thumbnail);
  if (image) embed.setImage(image);
  if (link) embed.setURL(link);

  return embed;
}