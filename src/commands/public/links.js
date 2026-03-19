import { SlashCommandBuilder } from 'discord.js';
import { env } from '../../config/env.js';

export const data = new SlashCommandBuilder()
  .setName('links')
  .setDescription('Get official Untitled Run links.');

export async function execute(interaction) {
  await interaction.reply({
    ephemeral: true,
    content: [
      `Website: ${env.publicSiteUrl}`,
      `Admin dashboard: ${env.adminDashboardUrl}`
    ].join('\n')
  });
}
