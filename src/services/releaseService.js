import { releaseEmbed } from '../embeds/releaseEmbed.js';
import { createRelease, getLatestRelease } from '../repositories/releaseRepo.js';
import { loadGuildConfig } from './guildConfigService.js';

export async function postRelease(interaction, payload) {
  const guildConfig = await loadGuildConfig(interaction.guildId);
  const channelKey = payload.status === 'dev' ? 'buildsDev' : 'buildsStable';
  const channelId = guildConfig.channels[channelKey]?.channelId;
  const channel = await interaction.guild.channels.fetch(channelId);

  const mentionRoleId = payload.mentionTesters ? guildConfig.roles.tester?.roleId : null;
  const content = mentionRoleId ? `<@&${mentionRoleId}>` : '';
  const message = await channel.send({
    content,
    embeds: [releaseEmbed(payload)]
  });

  await createRelease(interaction.guildId, {
    ...payload,
    discordMessageId: message.id,
    targetChannelId: channelId,
    createdByUserId: interaction.user.id
  });

  return message;
}

export async function fetchLatestSummary(guildId) {
  const stable = await getLatestRelease(guildId, 'stable');
  const dev = await getLatestRelease(guildId, 'dev');
  return { stable, dev };
}
