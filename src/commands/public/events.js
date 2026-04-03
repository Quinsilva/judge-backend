import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { listUpcomingEventSummaries } from '../../services/eventService.js';

export const data = new SlashCommandBuilder()
  .setName('events')
  .setDescription('List upcoming scheduled events.');

export async function execute(interaction) {
  try {
    await interaction.deferReply({ ephemeral: true });

    const events = await listUpcomingEventSummaries(interaction.guildId, 5);

    if (!events.length) {
      await interaction.editReply({
        content: 'No upcoming events found.'
      });
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(0x7eebff)
      .setTitle('Upcoming Events')
      .setDescription('Scheduled broadcasts queued in the system.')
      .addFields(
        events.map((event) => ({
          name: event.title,
          value: [
            `**Schedule:** ${event.displayTime}`,
            `**Status:** ${event.status || 'scheduled'}`,
            event.voiceChannelName
              ? `**Voice:** ${event.voiceChannelName}`
              : null,
            `**Event ID:** \`${event.eventId || event.id}\``
          ]
            .filter(Boolean)
            .join('\n')
        }))
      )
      .setFooter({
        text: 'JUDGE // UPCOMING EVENT INDEX'
      })
      .setTimestamp();

    await interaction.editReply({
      embeds: [embed]
    });
  } catch (error) {
    console.error('Error running /events:', error);

    if (interaction.deferred || interaction.replied) {
      await interaction.editReply({
        content: error.message || 'Failed to load upcoming events.'
      }).catch(() => {});
    } else {
      await interaction.reply({
        ephemeral: true,
        content: error.message || 'Failed to load upcoming events.'
      }).catch(() => {});
    }
  }
}