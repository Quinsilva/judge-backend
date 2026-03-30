import { Client, GatewayIntentBits, Events } from 'discord.js';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { attachInteractionHandler } from './interactionHandler.js';
import { registerSchedulers } from '../services/schedulerService.js';
import {
  setBotClient,
  clearBotClient,
  markBotReady,
  setLastBotError
} from './botInstance.js';

let connectPromise = null;
let reconnectTimer = null;
let reconnectAttempts = 0;

function getReconnectDelayMs(attempt) {
  const base = Math.min(30000, 2000 * Math.max(1, attempt));
  const jitter = Math.floor(Math.random() * 1000);
  return base + jitter;
}

function attachLifecycleLogging(client) {
  client.once(Events.ClientReady, (readyClient) => {
    reconnectAttempts = 0;
    markBotReady(true);
    setLastBotError(null);

    logger.info(`Judge logged in as ${readyClient.user.tag}`);
    registerSchedulers(client);
  });

  client.on(Events.Warn, (warning) => {
    logger.warn(`Discord client warning: ${warning}`);
  });

  client.on(Events.Error, (error) => {
    logger.error('Discord client error', error);
    setLastBotError(error);
  });

  client.on(Events.Invalidated, () => {
    logger.error('Discord session invalidated');
    markBotReady(false);
    setLastBotError(new Error('Discord session invalidated'));
  });

  client.on('shardReady', (shardId) => {
    logger.info(`Shard ${shardId} ready`);
  });

  client.on('shardDisconnect', (event, shardId) => {
    markBotReady(false);
    const error = new Error(
      `Shard ${shardId} disconnected with code ${event.code}, reason: ${event.reason || 'unknown'}`
    );
    logger.error(error.message);
    setLastBotError(error);
    scheduleReconnect();
  });

  client.on('shardError', (error, shardId) => {
    markBotReady(false);
    logger.error(`Shard ${shardId} error`, error);
    setLastBotError(error);
  });

  client.on('shardReconnecting', (shardId) => {
    markBotReady(false);
    logger.warn(`Shard ${shardId} reconnecting`);
  });

  client.on('shardResume', (shardId, replayedEvents) => {
    markBotReady(true);
    logger.info(`Shard ${shardId} resumed with ${replayedEvents} replayed events`);
  });
}

function scheduleReconnect() {
  if (reconnectTimer) {
    return;
  }

  reconnectAttempts += 1;
  const delay = getReconnectDelayMs(reconnectAttempts);

  logger.warn(`Scheduling Discord reconnect attempt ${reconnectAttempts} in ${delay}ms`);

  reconnectTimer = setTimeout(async () => {
    reconnectTimer = null;

    try {
      await createBotClient(true);
    } catch (error) {
      logger.error('Reconnect attempt failed', error);
      scheduleReconnect();
    }
  }, delay);
}

export async function createBotClient(isReconnect = false) {
  if (connectPromise) {
    return connectPromise;
  }

  connectPromise = (async () => {
    if (isReconnect) {
      clearBotClient();
    }

    markBotReady(false);
    setLastBotError(null);

    const client = new Client({
      intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers]
    });

    attachInteractionHandler(client);
    attachLifecycleLogging(client);

    const token = env.discordToken.trim();

    try {
      logger.info(isReconnect ? 'Attempting Discord reconnect...' : 'Attempting Discord login...');

      await client.login(token);

      setBotClient(client);
      logger.info('Discord login promise resolved');

      return client;
    } catch (error) {
      clearBotClient();
      setLastBotError(error);
      logger.error('Discord login failed', error);
      throw error;
    } finally {
      connectPromise = null;
    }
  })();

  return connectPromise;
}