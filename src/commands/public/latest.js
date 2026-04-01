import { SlashCommandBuilder } from 'discord.js';
import { fetchLatestSummary } from '../../services/releaseService.js';

export const data = new SlashCommandBuilder()
  .setName('latest')
  .setDescription('Get the latest build summary.');

export async function execute(interaction) {
  try {
    await interaction.deferReply({ ephemeral: true });

    const latest = await fetchLatestSummary(interaction.guildId);

    await interaction.editReply({
      content: [
        `Latest stable: ${latest?.stable?.version || 'None yet'}`,
        `Latest dev: ${latest?.dev?.version || 'None yet'}`
      ].join('\n')
    });
  } catch (error) {
    console.error('Error running /latest:', error);

    if (interaction.deferred || interaction.replied) {
      await interaction.editReply({
        content: error.message || 'Failed to fetch the latest build summary.'
      });
    } else {
      await interaction.reply({
        ephemeral: true,
        content: error.message || 'Failed to fetch the latest build summary.'
      });
    }
  }
}