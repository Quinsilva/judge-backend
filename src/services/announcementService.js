import { SlashCommandBuilder, ChannelType } from 'discord.js';
import { postAnnouncement } from '../services/announcementService.js';

export const data = new SlashCommandBuilder()
  .setName('announce')
  .setDescription('Post a polished announcement.')
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
  .addChannelOption((option) =>
    option
      .setName('channel')
      .setDescription('Channel to post the announcement in')
      .addChannelTypes(ChannelType.GuildText)
      .setRequired(false)
  );

export async function execute(interaction) {
  const message = await postAnnouncement(interaction, {
    title: interaction.options.getString('title', true),
    summary: interaction.options.getString('summary', true),
    body: interaction.options.getString('body', true),
    link: interaction.options.getString('link'),
    channel: interaction.options.getChannel('channel')
  });

  await interaction.reply({
    ephemeral: true,
    content: `Announcement posted in <#${message.channelId}>.`
  });
}