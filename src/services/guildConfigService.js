import { getGuildConfig } from '../repositories/guildRepo.js';

const cache = new Map();
const TTL_MS = 60_000;

export async function loadGuildConfig(guildId, { forceRefresh = false } = {}) {
  const cached = cache.get(guildId);

  if (!forceRefresh && cached && Date.now() - cached.loadedAt < TTL_MS) {
    return cached.value;
  }

  const value = await getGuildConfig(guildId);
  cache.set(guildId, { loadedAt: Date.now(), value });
  return value;
}

export function invalidateGuildConfig(guildId) {
  cache.delete(guildId);
}