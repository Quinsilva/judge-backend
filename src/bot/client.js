import { Client, GatewayIntentBits, Events } from 'discord.js';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { attachInteractionHandler } from './interactionHandler.js';
import { registerSchedulers } from '../services/schedulerService.js';
import { setBotClient } from './botInstance.js';

export async function createBotClient() {
  const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers]
  });

  attachInteractionHandler(client);

  client.once(Events.ClientReady, (readyClient) => {
    logger.info(`Judge logged in as ${readyClient.user.tag}`);
    registerSchedulers(client);
  });

  client.on(Events.Error, (error) => {
    logger.error('Discord client error:', error);
  });

  client.on(Events.Warn, (warning) => {
    logger.warn(`Discord client warning: ${warning}`);
  });

  setBotClient(client);

  logger.info(`DISCORD_TOKEN present: ${Boolean(env.discordToken)}`);
  logger.info(`DISCORD_CLIENT_ID present: ${Boolean(env.discordClientId)}`);
  logger.info(`DISCORD_GUILD_ID present: ${Boolean(env.discordGuildId)}`);

  try {
    await client.login(env.discordToken);
    logger.info('Discord login succeeded');
  } catch (error) {
    logger.error('Discord login failed:', error);
    throw error;
  }

  return client;
}