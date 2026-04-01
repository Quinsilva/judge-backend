import { env } from '../config/env.js';

export function getStaffRoleIds() {
  return Array.isArray(env.staffRoleIds)
    ? env.staffRoleIds
    : String(env.staffRoleIds || '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
}

export function memberHasStaffRole(interaction) {
  const allowedRoleIds = getStaffRoleIds();

  // IMPORTANT: allow all if no roles configured (prevents lockout)
  if (!allowedRoleIds.length) {
    return true;
  }

  const memberRoles = interaction.member?.roles?.cache;
  if (!memberRoles) {
    return false;
  }

  return allowedRoleIds.some((roleId) => memberRoles.has(roleId));
}

export async function requireStaffRole(interaction) {
  if (memberHasStaffRole(interaction)) {
    return true;
  }

  await interaction.reply({
    ephemeral: true,
    content: 'You are not authorized to use this staff command.'
  });

  return false;
}