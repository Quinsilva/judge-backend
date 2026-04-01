import {
  AttachmentBuilder,
  ChannelType,
  SlashCommandBuilder
} from 'discord.js';
import { playtestEmbed } from '../../embeds/playtestEmbed.js';
import {
  ensureGuildChannelConfig,
  ensureGuildRoleConfig
} from '../../repositories/guildRepo.js';
import {
  invalidateGuildConfig,
  loadGuildConfig
} from '../../services/guildConfigService.js';
import { requireStaffRole } from '../../utils/staffAuth.js';

async function tryRenderPlaytestCard(payload) {
  try {
    const mod = await import('../../renderers/renderPlaytestCard.js');
    return await mod.renderPlaytestCard(payload);
  } catch (error) {
    console.error('Playtest card render failed:', error);
    return null;
  }
}

async function sendPlaytestMessage(channel, roleId, payload) {
  const embed = playtestEmbed(payload);
  const imageBuffer = await tryRenderPlaytestCard(payload);
  const content = roleId ? `<@&${roleId}>` : undefined;

  if (imageBuffer) {
    try {
      const file = new AttachmentBuilder(imageBuffer, { name: 'playtest-card.png' });
      embed.setImage('attachment://playtest-card.png');

      const message = await channel.send({
        content,
        embeds: [embed],
        files: [file]
      });

      return { message, usedImage: true };
    } catch (error) {
      console.error('Playtest send with image failed, falling back to embed-only:', error);
    }
  }

  const message = await channel.send({
    content,
    embeds: [embed]
  });

  return { message, usedImage: false };
}

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

    await interaction.deferReply({ ephemeral: true });

    const autoCreated = [];

    const ensuredChannel = await ensureGuildChannelConfig(
      interaction.guildId,
      'alphaFeedback',
      interaction.channelId
    );

    if (ensuredChannel.created) {
      autoCreated.push(
        `Created Firestore path guilds/${interaction.guildId}/channels/alphaFeedback and defaulted it to this channel.`
      );
    }

    const ensuredRole = await ensureGuildRoleConfig(
      interaction.guildId,
      'tester',
      null
    );

    if (ensuredRole.created) {
      autoCreated.push(
        `Created Firestore path guilds/${interaction.guildId}/roles/tester with roleId: null.`
      );
    }

    invalidateGuildConfig(interaction.guildId);
    const guildConfig = await loadGuildConfig(interaction.guildId, { forceRefresh: true });

    const channelId = guildConfig?.channels?.alphaFeedback?.channelId;
    const roleId = guildConfig?.roles?.tester?.roleId;

    if (!channelId) {
      await interaction.editReply({
        content: [
          ...autoCreated,
          'alphaFeedback exists now, but channelId is still null. Set it in Firestore and run the command again.'
        ].join('\n')
      });
      return;
    }

    const channel = await interaction.guild.channels.fetch(channelId).catch((error) => {
      console.error('Failed to fetch playtest channel:', error);
      return null;
    });

    if (!channel) {
      await interaction.editReply({
        content: 'The configured alpha feedback channel could not be found.'
      });
      return;
    }

    if (
      channel.type !== ChannelType.GuildText &&
      channel.type !== ChannelType.GuildAnnouncement
    ) {
      await interaction.editReply({
        content: 'The configured alpha feedback channel is not a text channel.'
      });
      return;
    }

    const payload = {
      buildVersion: interaction.options.getString('build_version', true),
      focusAreas: interaction.options.getString('focus_areas', true),
      windowText: interaction.options.getString('window_text') || undefined,
      notes: interaction.options.getString('notes') || undefined
    };

    const result = await sendPlaytestMessage(channel, roleId, payload);

    await interaction.editReply({
      content: [
        `Playtest request posted in <#${result.message.channelId}>.`,
        result.usedImage
          ? 'Styled playtest card uploaded successfully.'
          : 'Playtest posted with embed-only fallback.',
        ...autoCreated
      ].join('\n')
    });
  } catch (error) {
    console.error('Error running /playtest:', error);

    if (interaction.deferred || interaction.replied) {
      await interaction.editReply({
        content: error.message || 'Something went wrong while posting the playtest request.'
      }).catch(() => {});
    } else {
      await interaction.reply({
        ephemeral: true,
        content: error.message || 'Something went wrong while posting the playtest request.'
      }).catch(() => {});
    }
  }
}