import { SlashCommandBuilder, ChannelType } from 'discord.js';
import { postAnnouncement } from '../../services/announcementService.js';
import { requireStaffRole } from '../../utils/staffAuth.js';

export const data = new SlashCommandBuilder()
  .setName('announce')
  .setDescription('Post a stylized announcement.')
  .addStringOption((option) =>
    option.setName('title').setDescription('Announcement title').setRequired(true)
  )
  .addStringOption((option) =>
    option.setName('summary').setDescription('Short summary').setRequired(true)
  )
  .addStringOption((option) =>
    option.setName('body').setDescription('Announcement body').setRequired(true)
  )
  .addStringOption((option) =>
    option.setName('link').setDescription('Optional link')
  )
  .addAttachmentOption((option) =>
    option
      .setName('image')
      .setDescription('Optional banner image attachment')
      .setRequired(false)
  )
  .addAttachmentOption((option) =>
    option
      .setName('thumbnail')
      .setDescription('Optional thumbnail image attachment')
      .setRequired(false)
  )
  .addStringOption((option) =>
    option
      .setName('theme')
      .setDescription('Optional overlay tint')
      .addChoices(
        { name: 'Neon Cyan', value: 'cyan' },
        { name: 'Warning Red', value: 'red' },
        { name: 'Toxic Green', value: 'green' },
        { name: 'Signal Purple', value: 'purple' }
      )
      .setRequired(false)
  )
  .addChannelOption((option) =>
    option
      .setName('channel')
      .setDescription('Channel to post the announcement in')
      .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
      .setRequired(false)
  );

export async function execute(interaction) {
  try {
    await interaction.deferReply({ ephemeral: true });

    const allowed = await requireStaffRole(interaction);
    if (!allowed) return;

    const image = interaction.options.getAttachment('image');
    const thumbnail = interaction.options.getAttachment('thumbnail');

    const result = await postAnnouncement(interaction, {
      title: interaction.options.getString('title', true),
      summary: interaction.options.getString('summary', true),
      body: interaction.options.getString('body', true),
      link: interaction.options.getString('link'),
      image,
      thumbnail,
      theme: interaction.options.getString('theme') ?? 'cyan',
      channel: interaction.options.getChannel('channel')
    });

    await interaction.editReply({
      content: [
        `Announcement posted in <#${result.message.channelId}>.`,
        result.usedImage
          ? 'Digital announcement card uploaded successfully.'
          : 'Announcement posted with embed-only fallback.'
      ].join('\n')
    });
  } catch (error) {
    console.error('Error running /announce:', error);

    if (interaction.deferred || interaction.replied) {
      await interaction.editReply({
        content: error.message || 'Something went wrong while posting the announcement.'
      }).catch(() => {});
    } else {
      await interaction.reply({
        ephemeral: true,
        content: error.message || 'Something went wrong while posting the announcement.'
      }).catch(() => {});
    }
  }
}