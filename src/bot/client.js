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
    logger.error('Discord client error', error);
  });

  client.on(Events.Warn, (warning) => {
    logger.warn(`Discord client warning: ${warning}`);
  });

  try {
    await Promise.race([
      client.login(env.discordToken),
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Discord login timed out after 20 seconds')), 20000);
      })
    ]);

    setBotClient(client);
    logger.info('Discord login succeeded');
    return client;
  } catch (error) {
    logger.error('Discord login failed', error);
    throw error;
  }
}