import { AttachmentBuilder, ChannelType } from 'discord.js';
import { releaseEmbed } from '../embeds/releaseEmbed.js';
import { renderReleaseCard } from '../renderers/renderReleaseCard.js';
import { createRelease, getLatestRelease } from '../repositories/releaseRepo.js';
import {
  ensureGuildChannelConfig,
  ensureGuildRoleConfig
} from '../repositories/guildRepo.js';
import {
  invalidateGuildConfig,
  loadGuildConfig
} from './guildConfigService.js';

export async function postRelease(interaction, payload) {
  const channelKey = payload.status === 'dev' ? 'buildsDev' : 'buildsStable';
  const autoCreated = [];

  const ensuredChannel = await ensureGuildChannelConfig(
    interaction.guildId,
    channelKey,
    interaction.channelId
  );

  if (ensuredChannel.created) {
    autoCreated.push(
      `Created Firestore path guilds/${interaction.guildId}/channels/${channelKey} and defaulted it to this channel.`
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

  const channelId = guildConfig?.channels?.[channelKey]?.channelId;

  if (!channelId) {
    throw new Error(
      `${channelKey} exists now, but channelId is still null. Set it in Firestore and try again.`
    );
  }

  const channel = await interaction.guild.channels.fetch(channelId).catch(() => null);

  if (!channel) {
    throw new Error('The configured release channel could not be found.');
  }

  if (
    channel.type !== ChannelType.GuildText &&
    channel.type !== ChannelType.GuildAnnouncement
  ) {
    throw new Error('The configured release channel is not a text channel.');
  }

  const mentionRoleId = payload.mentionTesters
    ? guildConfig?.roles?.tester?.roleId
    : null;

  const content = mentionRoleId ? `<@&${mentionRoleId}>` : undefined;

  const imageBuffer = await renderReleaseCard(payload);
  const file = new AttachmentBuilder(imageBuffer, { name: 'release-card.png' });

  const embed = releaseEmbed(payload).setImage('attachment://release-card.png');

  const message = await channel.send({
    content,
    embeds: [embed],
    files: [file]
  });

  const releaseId = await createRelease(interaction.guildId, {
    ...payload,
    discordMessageId: message.id,
    targetChannelId: channelId,
    createdByUserId: interaction.user.id
  });

  return {
    message,
    releaseId,
    autoCreated
  };
}

export async function fetchLatestSummary(guildId) {
  const stable = await getLatestRelease(guildId, 'stable');
  const dev = await getLatestRelease(guildId, 'dev');
  return { stable, dev };
}