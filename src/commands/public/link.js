import { SlashCommandBuilder } from 'discord.js';
import crypto from 'crypto';
import { firestore } from '../../firebase/admin.js';
import { env } from '../../config/env.js';

export const data = new SlashCommandBuilder()
  .setName('link')
  .setDescription('Link your Discord account to your Untitled Run account');

export async function execute(interaction) {
  const token = crypto.randomBytes(20).toString('hex');
  const now = Date.now();

  await firestore.collection('linkTokens').doc(token).set({
    discordUserId: interaction.user.id,
    discordUsername: interaction.user.username,
    discordGlobalName: interaction.user.globalName || '',
    guildId: interaction.guildId,
    createdAt: now,
    expiresAt: now + 1000 * 60 * 10,
    used: false,
    usedAt: null,
    linkedPlayerUid: null
  });

  const baseUrl = env.adminDashboardUrl || 'http://localhost:5173';
  const normalizedBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  const url = `${normalizedBase}/link?token=${token}`;

  await interaction.reply({
    content:
      `Link your account here:\n${url}\n\n` +
      `This link expires in 10 minutes. If it expires, run /link again.`,
    ephemeral: true
  });
}