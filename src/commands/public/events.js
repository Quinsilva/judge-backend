import { SlashCommandBuilder } from 'discord.js';
import { listUpcomingEvents } from '../../services/eventService.js';

export const data = new SlashCommandBuilder()
  .setName('events')
  .setDescription('List upcoming events.');

export async function execute(interaction) {
  const events = await listUpcomingEvents(interaction.guildId);
  const content = events.length
    ? events.map((event) => `• ${event.title} — ${event.startTime}`).join('\n')
    : 'No upcoming events found.';
  await interaction.reply({ ephemeral: true, content });
}
