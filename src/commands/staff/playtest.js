import { SlashCommandBuilder } from 'discord.js';
import { playtestEmbed } from '../../embeds/playtestEmbed.js';
import { loadGuildConfig } from '../../services/guildConfigService.js';
import { requireStaffRole } from '../../utils/staffAuth.js';

export const data = new SlashCommandBuilder()
  .setName('playtest')
  .setDescription('Call for a QA playtest.')
  .addStringOption((option) => option.setName('build_version').setDescription('Build version').setRequired(true))
  .addStringOption((option) => option.setName('focus_areas').setDescription('Focus areas').setRequired(true))
  .addStringOption((option) => option.setName('window_text').setDescription('Testing window'))
  .addStringOption((option) => option.setName('notes').setDescription('Additional notes'));

export async function execute(interaction) {
  const allowed = await requireStaffRole(interaction);
  if (!allowed) return;
  const guildConfig = await loadGuildConfig(interaction.guildId);
  const channelId = guildConfig.channels.alphaFeedback?.channelId;
  const roleId = guildConfig.roles.tester?.roleId;
  const channel = await interaction.guild.channels.fetch(channelId);
  const message = await channel.send({
    content: roleId ? `<@&${roleId}>` : '',
    embeds: [
      playtestEmbed({
        buildVersion: interaction.options.getString('build_version', true),
        focusAreas: interaction.options.getString('focus_areas', true),
        windowText: interaction.options.getString('window_text') || undefined,
        notes: interaction.options.getString('notes') || undefined
      })
    ]
  });
  await interaction.reply({ ephemeral: true, content: `Playtest request posted in <#${message.channelId}>.` });
}
