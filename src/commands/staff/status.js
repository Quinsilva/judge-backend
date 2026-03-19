import { SlashCommandBuilder } from 'discord.js';
import { env } from '../../config/env.js';

export const data = new SlashCommandBuilder()
  .setName('status')
  .setDescription('Check Judge service status.');

export async function execute(interaction) {
  await interaction.reply({
    ephemeral: true,
    content: [
      `Environment: ${env.nodeEnv}`,
      `Site: ${env.publicSiteUrl}`,
      `Dashboard: ${env.adminDashboardUrl}`
    ].join('\n')
  });
}
