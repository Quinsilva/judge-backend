import { REST, Routes } from 'discord.js';
import { env } from '../config/env.js';
import { commands } from './commandRegistry.js';
import { logger } from '../utils/logger.js';

export async function registerCommands() {
  const rest = new REST({ version: '10' }).setToken(env.discordToken);
  const body = commands.map((command) => command.data.toJSON());

  if (env.discordGuildId) {
    await rest.put(Routes.applicationGuildCommands(env.discordClientId, env.discordGuildId), { body });
    logger.info('Registered guild commands', body.length);
    return;
  }

  await rest.put(Routes.applicationCommands(env.discordClientId), { body });
  logger.info('Registered global commands', body.length);
}
