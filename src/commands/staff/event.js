import { SlashCommandBuilder } from 'discord.js';
import { postEvent } from '../../services/eventService.js';

export const data = new SlashCommandBuilder()
  .setName('event')
  .setDescription('Create an event announcement.')
  .addStringOption((option) => option.setName('title').setDescription('Event title').setRequired(true))
  .addStringOption((option) => option.setName('description').setDescription('Event description').setRequired(true))
  .addStringOption((option) => option.setName('start_time').setDescription('Start time text').setRequired(true))
  .addStringOption((option) => option.setName('end_time').setDescription('End time text'));

export async function execute(interaction) {
  const now = new Date();
  const message = await postEvent(interaction, {
    title: interaction.options.getString('title', true),
    description: interaction.options.getString('description', true),
    startTimeText: interaction.options.getString('start_time', true),
    endTimeText: interaction.options.getString('end_time') || undefined,
    startTimeIso: now.toISOString(),
    endTimeIso: null,
    voiceChannelName: 'Community Hangout'
  });

  await interaction.reply({ ephemeral: true, content: `Event posted in <#${message.channelId}>.` });
}
