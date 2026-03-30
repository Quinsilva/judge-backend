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
  // 15s, 30s, 60s, 120s, 240s, max 5 min
  const delay = Math.min(300000, 15000 * Math.pow(2, Math.max(0, attempt - 1)));
  const jitter = Math.floor(Math.random() * 2000);
  return delay + jitter;
}

function scheduleReconnect() {
  if (reconnectTimer || connectPromise) return;

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
    const error = new Error('Discord session invalidated');
    logger.error(error.message);
    markBotReady(false);
    setLastBotError(error);
    clearBotClient();
    scheduleReconnect();
  });

  client.on('shardDisconnect', (event, shardId) => {
    const error = new Error(
      `Shard ${shardId} disconnected with code ${event.code}, reason: ${event.reason || 'unknown'}`
    );
    logger.error(error.message);
    markBotReady(false);
    setLastBotError(error);
    clearBotClient();
    scheduleReconnect();
  });

  client.on('shardError', (error, shardId) => {
    logger.error(`Shard ${shardId} error`, error);
    markBotReady(false);
    setLastBotError(error);
  });

  client.on('shardReconnecting', (shardId) => {
    logger.warn(`Shard ${shardId} reconnecting`);
    markBotReady(false);
  });

  client.on('shardResume', (shardId, replayedEvents) => {
    logger.info(`Shard ${shardId} resumed with ${replayedEvents} replayed events`);
    markBotReady(true);
    setLastBotError(null);
  });
}

export async function createBotClient(isReconnect = false) {
  if (connectPromise) return connectPromise;

  connectPromise = (async () => {
    markBotReady(false);

    if (isReconnect) {
      clearBotClient();
    }

    const client = new Client({
      intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers]
    });

    attachInteractionHandler(client);
    attachLifecycleLogging(client);

    try {
      const token = env.discordToken.trim();

      logger.info(isReconnect ? 'Attempting Discord reconnect...' : 'Attempting Discord login...');

      await client.login(token);

      setBotClient(client);
      logger.info('Discord login promise resolved');

      return client;
    } catch (error) {
      clearBotClient();
      setLastBotError(error);
      logger.error('Discord login failed', error);
      scheduleReconnect();
      throw error;
    } finally {
      connectPromise = null;
    }
  })();

  return connectPromise;
}