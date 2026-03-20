import { SlashCommandBuilder } from 'discord.js';
import { env } from '../../config/env.js';
import { requireStaffRole } from '../../utils/staffAuth.js';

export const data = new SlashCommandBuilder()
  .setName('status')
  .setDescription('Check Judge service status.');

export async function execute(interaction) {
  const allowed = await requireStaffRole(interaction);
    if (!allowed) return;
  await interaction.reply({
    ephemeral: true,
    content: [
      `Environment: ${env.nodeEnv}`,
      `Site: ${env.publicSiteUrl}`,
      `Dashboard: ${env.adminDashboardUrl}`
    ].join('\n')
  });
}
