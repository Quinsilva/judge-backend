import { EmbedBuilder } from 'discord.js';

const THEME_COLORS = {
  cyan: 0x00e5ff,
  red: 0xff204e,
  green: 0x39ff14,
  purple: 0x9b5cff,
};

function clip(text = '', max = 1024) {
  if (text.length <= max) return text;
  return text.slice(0, max - 3) + '...';
}

function stylizeTitle(title = '') {
  return `⟦ ${title.toUpperCase()} ⟧`;
}

function stylizeSummary(summary = '') {
  return [
    '> PACKET STATUS: RECOVERED',
    '> CHANNEL: PUBLIC BROADCAST',
    '> SIGNAL INTEGRITY: DEGRADED',
    '',
    `**${clip(summary, 260)}**`,
  ].join('\n');
}

export function publicAnnouncementEmbed({
  title,
  summary,
  body,
  link,
  image,
  thumbnail,
  theme = 'cyan',
}) {
  const color = THEME_COLORS[theme] ?? THEME_COLORS.cyan;

  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(stylizeTitle(title))
    .setDescription(stylizeSummary(summary))
    .addFields({
      name: '▌ ARCHIVE LOG',
      value: `\`\`\`${clip(body, 1000)}\`\`\``,
    })
    .setFooter({
      text: 'JUDGE // OFFICIAL RUN UPDATE // TRACE ACTIVE',
    })
    .setTimestamp();

  if (thumbnail) {
    embed.setThumbnail(thumbnail);
  }

  if (image) {
    embed.setImage(image);
  }

  if (link) {
    embed
      .setURL(link)
      .addFields({
        name: '▌ ACCESS NODE',
        value: `[OPEN TRANSMISSION](${link})`,
      });
  }

  return embed;
}