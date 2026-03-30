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
  .addStringOption((option) =>
    option.setName('image').setDescription('Optional banner image URL')
  )
  .addStringOption((option) =>
    option.setName('thumbnail').setDescription('Optional thumbnail image URL')
  )
  .addStringOption((option) =>
    option
      .setName('theme')
      .setDescription('Visual theme')
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
      .addChannelTypes(ChannelType.GuildText)
      .setRequired(false)
  );

export async function execute(interaction) {
  const allowed = await requireStaffRole(interaction);
  if (!allowed) return;

  const message = await postAnnouncement(interaction, {
    title: interaction.options.getString('title', true),
    summary: interaction.options.getString('summary', true),
    body: interaction.options.getString('body', true),
    link: interaction.options.getString('link'),
    image: interaction.options.getString('image'),
    thumbnail: interaction.options.getString('thumbnail'),
    theme: interaction.options.getString('theme') ?? 'cyan',
    channel: interaction.options.getChannel('channel')
  });

  await interaction.reply({
    ephemeral: true,
    content: `Announcement posted in <#${message.channelId}>.`
  });
}