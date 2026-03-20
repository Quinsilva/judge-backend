import { env } from '../config/env.js';

function parseRoleIds(value) {
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export function getStaffRoleIds() {
  return parseRoleIds(env.staffRoleIds);
}

export function memberHasStaffRole(interaction) {
  const allowedRoleIds = getStaffRoleIds();

  if (!allowedRoleIds.length) {
    return false;
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