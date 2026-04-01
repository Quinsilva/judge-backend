import { SlashCommandBuilder } from 'discord.js';
import { firestore } from '../../firebase/admin.js';
import { ensureRewardsConfig } from '../../repositories/guildRepo.js';

const ALLOWED_CONTENT_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/gif'
]);

export const data = new SlashCommandBuilder()
  .setName('submitmedia')
  .setDescription('Submit media directly for admin approval')
  .addAttachmentOption((option) =>
    option
      .setName('file')
      .setDescription('Upload a PNG, JPG, or GIF')
      .setRequired(true)
  )
  .addStringOption((option) =>
    option
      .setName('caption')
      .setDescription('Optional caption for your submission')
      .setRequired(false)
  );

export async function execute(interaction) {
  const file = interaction.options.getAttachment('file', true);
  const caption = interaction.options.getString('caption') || '';

  try {
    const ensuredRewards = await ensureRewardsConfig(interaction.guildId);
    const autoCreated = [];

    if (ensuredRewards.created) {
      autoCreated.push(
        `Created Firestore path guilds/${interaction.guildId}/config/rewards with default values.`
      );
    }

    const configSnap = await firestore
      .collection('guilds')
      .doc(interaction.guildId)
      .collection('config')
      .doc('rewards')
      .get();

    const config = configSnap.exists ? configSnap.data() : {};
    const submissionsEnabled = config.mediaSubmissionsEnabled !== false;

    if (!submissionsEnabled) {
      await interaction.reply({
        ephemeral: true,
        content: [
          ...autoCreated,
          'Media submissions are not enabled for this server.'
        ].join('\n')
      });
      return;
    }

    if (!file.contentType || !ALLOWED_CONTENT_TYPES.has(file.contentType)) {
      await interaction.reply({
        ephemeral: true,
        content: 'Only PNG, JPG, and GIF files are allowed.'
      });
      return;
    }

    const submissionRef = firestore
      .collection('guilds')
      .doc(interaction.guildId)
      .collection('mediaSubmissions')
      .doc();

    const now = Date.now();

    await submissionRef.set(
      {
        submissionId: submissionRef.id,
        guildId: interaction.guildId,
        channelId: interaction.channelId,
        messageId: null,
        discordUserId: interaction.user.id,
        discordUsername: interaction.user.username,
        discordDisplayName:
          interaction.member?.displayName ||
          interaction.user.globalName ||
          interaction.user.username,
        content: caption,
        attachmentUrls: [file.url],
        attachmentMeta: [
          {
            name: file.name,
            contentType: file.contentType,
            size: file.size
          }
        ],
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
      content: [
        'Your submission has been queued for admin review.',
        ...autoCreated
      ].join('\n')
    });
  } catch (error) {
    console.error('submitmedia failed', error);

    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        ephemeral: true,
        content: error.message || 'Failed to queue your submission for review.'
      });
    }
  }
}