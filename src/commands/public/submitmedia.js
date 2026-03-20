import { SlashCommandBuilder } from 'discord.js';
import { firestore } from '../../firebase/admin.js';

export const data = new SlashCommandBuilder()
  .setName('submitmedia')
  .setDescription('Submit one of your media messages for admin approval')
  .addStringOption((option) =>
    option
      .setName('message_id')
      .setDescription('The message ID containing your media')
      .setRequired(true)
  )
  .addChannelOption((option) =>
    option
      .setName('channel')
      .setDescription('The channel containing the message')
      .setRequired(true)
  );

export async function execute(interaction) {
  const messageId = interaction.options.getString('message_id', true);
  const channel = interaction.options.getChannel('channel', true);

  try {
    const configSnap = await firestore
      .collection('guilds')
      .doc(interaction.guildId)
      .collection('config')
      .doc('rewards')
      .get();

    const config = configSnap.exists ? configSnap.data() : {};
    const approvedChannelIds = Array.isArray(config.approvedChannelIds)
      ? config.approvedChannelIds
      : [];

    if (!approvedChannelIds.includes(channel.id)) {
      await interaction.reply({
        ephemeral: true,
        content: 'That channel is not configured for media submissions.'
      });
      return;
    }

    const message = await channel.messages.fetch(messageId);

    if (!message) {
      await interaction.reply({
        ephemeral: true,
        content: 'Message not found.'
      });
      return;
    }

    if (message.author.id !== interaction.user.id) {
      await interaction.reply({
        ephemeral: true,
        content: 'You can only submit your own media messages.'
      });
      return;
    }

    const attachmentUrls = [...message.attachments.values()].map((a) => a.url);

    if (!attachmentUrls.length) {
      await interaction.reply({
        ephemeral: true,
        content: 'That message has no media attachments.'
      });
      return;
    }

    const submissionId = `${channel.id}-${message.id}`;
    const now = Date.now();

    await firestore
      .collection('guilds')
      .doc(interaction.guildId)
      .collection('mediaSubmissions')
      .doc(submissionId)
      .set(
        {
          submissionId,
          guildId: interaction.guildId,
          channelId: channel.id,
          messageId: message.id,
          discordUserId: message.author.id,
          discordUsername: message.author.username,
          discordDisplayName:
            message.member?.displayName || message.author.username,
          content: message.content || '',
          attachmentUrls,
          status: 'pending',
          createdAt: now,
          reviewedAt: null,
          reviewedBy: null,
          reviewDecision: null
        },
        { merge: true }
      );

    await interaction.reply({
      ephemeral: true,
      content: 'Your submission has been queued for admin review.'
    });
  } catch (error) {
    console.error('submitmedia failed', error);

    await interaction.reply({
      ephemeral: true,
      content: 'Failed to queue that message for review.'
    });
  }
}