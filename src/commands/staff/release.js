import { SlashCommandBuilder } from 'discord.js';
import { postRelease } from '../../services/releaseService.js';
import { requireStaffRole } from '../../utils/staffAuth.js';

export const data = new SlashCommandBuilder()
  .setName('release')
  .setDescription('Post a dev or stable release note.')
  .addStringOption((option) => option.setName('version').setDescription('Version').setRequired(true))
  .addStringOption((option) => option.setName('build_name').setDescription('Build name').setRequired(true))
  .addStringOption((option) => option.setName('status').setDescription('Build status').setRequired(true).addChoices(
    { name: 'dev', value: 'dev' },
    { name: 'stable', value: 'stable' },
    { name: 'hotfix', value: 'hotfix' }
  ))
  .addStringOption((option) => option.setName('highlights').setDescription('Comma-separated highlights').setRequired(true))
  .addStringOption((option) => option.setName('known_issues').setDescription('Comma-separated known issues'))
  .addStringOption((option) => option.setName('call_to_action').setDescription('Next step'))
  .addBooleanOption((option) => option.setName('mention_testers').setDescription('Ping QA testers?'));

export async function execute(interaction) {
  const allowed = await requireStaffRole(interaction);
  if (!allowed) return;
  const message = await postRelease(interaction, {
    version: interaction.options.getString('version', true),
    buildName: interaction.options.getString('build_name', true),
    status: interaction.options.getString('status', true),
    highlights: interaction.options.getString('highlights', true).split(',').map((v) => v.trim()),
    knownIssues: (interaction.options.getString('known_issues') || '').split(',').map((v) => v.trim()).filter(Boolean),
    callToAction: interaction.options.getString('call_to_action') || 'Share feedback in #alpha-feedback.',
    mentionTesters: interaction.options.getBoolean('mention_testers') || false
  });

  await interaction.reply({ ephemeral: true, content: `Release posted in <#${message.channelId}>.` });
}
