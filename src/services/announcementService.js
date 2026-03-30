import { EmbedBuilder } from 'discord.js';
import { firestore } from '../firebase/admin.js';

const THEME_COLORS = {
  cyan: 0x00e5ff,
  red: 0xff204e,
  green: 0x39ff14,
  purple: 0x9b5cff,
};

function clip(text = '', max = 1024) {
  if (!text) return '';
  return text.length > max ? `${text.slice(0, max - 3)}...` : text;
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

export async function postAnnouncement(interaction, payload) {
  const {
    title,
    summary,
    body,
    link,
    image,
    thumbnail,
    theme = 'cyan',
    channel,
  } = payload;

  let targetChannel = channel;

  if (!targetChannel) {
    const configSnap = await firestore
      .collection('guilds')
      .doc(interaction.guildId)
      .collection('config')
      .doc('guild')
      .get();

    const config = configSnap.exists ? configSnap.data() : {};
    const announcementChannelId = config?.channels?.announcements?.channelId;

    if (!announcementChannelId) {
      throw new Error('No announcement channel is configured.');
    }

    targetChannel = await interaction.guild.channels.fetch(announcementChannelId);
  }

  if (!targetChannel || !targetChannel.isTextBased()) {
    throw new Error('Selected channel is not a valid text channel.');
  }

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
    embed.setURL(link).addFields({
      name: '▌ ACCESS NODE',
      value: `[OPEN TRANSMISSION](${link})`,
    });
  }

  const message = await targetChannel.send({ embeds: [embed] });
  return message;
}