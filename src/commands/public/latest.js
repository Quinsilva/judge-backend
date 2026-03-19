import { SlashCommandBuilder } from 'discord.js';
import { fetchLatestSummary } from '../../services/releaseService.js';

export const data = new SlashCommandBuilder()
  .setName('latest')
  .setDescription('Get the latest build summary.');

export async function execute(interaction) {
  const latest = await fetchLatestSummary(interaction.guildId);
  await interaction.reply({
    ephemeral: true,
    content: [
      `Latest stable: ${latest.stable ? latest.stable.version : 'None yet'}`,
      `Latest dev: ${latest.dev ? latest.dev.version : 'None yet'}`
    ].join('\n')
  });
}
