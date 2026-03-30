import { Client, GatewayIntentBits, Events } from 'discord.js';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { attachInteractionHandler } from './interactionHandler.js';
import { registerSchedulers } from '../services/schedulerService.js';
import { setBotClient } from './botInstance.js';

export async function createBotClient() {
  logger.info('createBotClient() entered');

  const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers]
  });

  logger.info('Discord Client instance constructed');

  attachInteractionHandler(client);
  logger.info('Interaction handler attached');

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

  client.on(Events.Debug, (message) => {
    logger.info(`Discord debug: ${message}`);
  });

  client.on(Events.Invalidated, () => {
    logger.error('Discord session invalidated');
  });

  client.on('shardReady', (shardId) => {
    logger.info(`Shard ${shardId} ready`);
  });

  client.on('shardDisconnect', (event, shardId) => {
    logger.error(
      `Shard ${shardId} disconnected with code ${event.code}, reason: ${event.reason || 'unknown'}`
    );
  });

  client.on('shardError', (error, shardId) => {
    logger.error(`Shard ${shardId} error`, error);
  });

  client.on('shardReconnecting', (shardId) => {
    logger.warn(`Shard ${shardId} reconnecting`);
  });

  setBotClient(client);
  logger.info('Bot client stored');

  logger.info(`DISCORD_TOKEN present: ${Boolean(env.discordToken)}`);
  logger.info(`DISCORD_CLIENT_ID present: ${Boolean(env.discordClientId)}`);
  logger.info(`DISCORD_GUILD_ID present: ${Boolean(env.discordGuildId)}`);

  try {
    const token = env.discordToken.trim();
    logger.info(`DISCORD_TOKEN length after trim: ${token.length}`);
    logger.info('About to call client.login()');

    await Promise.race([
      client.login(token),
      new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error('Discord login timed out after 20 seconds'));
        }, 20000);
      })
    ]);

    logger.info('Discord login succeeded');
    return client;
  } catch (error) {
    logger.error('Discord login failed', error);
    throw error;
  }
}