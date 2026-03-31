import { ChannelType, SlashCommandBuilder } from 'discord.js';
import { playtestEmbed } from '../../embeds/playtestEmbed.js';
import { loadGuildConfig } from '../../services/guildConfigService.js';
import { requireStaffRole } from '../../utils/staffAuth.js';

export const data = new SlashCommandBuilder()
  .setName('playtest')
  .setDescription('Call for a QA playtest.')
  .addStringOption((option) =>
    option.setName('build_version').setDescription('Build version').setRequired(true)
  )
  .addStringOption((option) =>
    option.setName('focus_areas').setDescription('Focus areas').setRequired(true)
  )
  .addStringOption((option) =>
    option.setName('window_text').setDescription('Testing window')
  )
  .addStringOption((option) =>
    option.setName('notes').setDescription('Additional notes')
  );

export async function execute(interaction) {
  try {
    const allowed = await requireStaffRole(interaction);
    if (!allowed) return;

    const guildConfig = await loadGuildConfig(interaction.guildId);
    const channelId = guildConfig?.channels?.alphaFeedback?.channelId;
    const roleId = guildConfig?.roles?.tester?.roleId;

    if (!channelId) {
      await interaction.reply({
        ephemeral: true,
        content: 'Alpha feedback channel is not configured for this server.'
      });
      return;
    }

    const channel = await interaction.guild.channels.fetch(channelId).catch(() => null);

    if (!channel) {
      await interaction.reply({
        ephemeral: true,
        content: 'The configured alpha feedback channel could not be found.'
      });
      return;
    }

    if (
      channel.type !== ChannelType.GuildText &&
      channel.type !== ChannelType.GuildAnnouncement
    ) {
      await interaction.reply({
        ephemeral: true,
        content: 'The configured alpha feedback channel is not a text channel.'
      });
      return;
    }

    const message = await channel.send({
      content: roleId ? `<@&${roleId}>` : undefined,
      embeds: [
        playtestEmbed({
          buildVersion: interaction.options.getString('build_version', true),
          focusAreas: interaction.options.getString('focus_areas', true),
          windowText: interaction.options.getString('window_text') || undefined,
          notes: interaction.options.getString('notes') || undefined
        })
      ]
    });

    await interaction.reply({
      ephemeral: true,
      content: `Playtest request posted in <#${message.channelId}>.`
    });
  } catch (error) {
    console.error('Error running /playtest:', error);

    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        ephemeral: true,
        content: 'Something went wrong while posting the playtest request.'
      });
    }
  }
}