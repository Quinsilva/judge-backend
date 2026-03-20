import { EmbedBuilder } from 'discord.js';
import { firestore } from '../firebase/admin.js';

export async function postAnnouncement(interaction, payload) {
  const { title, summary, body, link, channel } = payload;

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

  const embed = new EmbedBuilder()
    .setTitle(title)
    .setDescription(`${summary}\n\n${body}`)
    .setTimestamp();

  if (link) {
    embed.addFields({ name: 'Link', value: link });
  }

  const message = await targetChannel.send({ embeds: [embed] });
  return message;
}