export function memberHasAnyRole(member, roleIds) {
  if (!member || !roleIds?.length) return false;
  return roleIds.some((roleId) => member.roles.cache.has(roleId));
}
