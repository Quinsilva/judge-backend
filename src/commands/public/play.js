import { SlashCommandBuilder } from 'discord.js';
import { env } from '../../config/env.js';

export const data = new SlashCommandBuilder()
  .setName('play')
  .setDescription('Get the current Untitled Run play link.');

export async function execute(interaction) {
  await interaction.reply({ content: `Play Untitled Run: ${env.publicSiteUrl}`, ephemeral: true });
}
