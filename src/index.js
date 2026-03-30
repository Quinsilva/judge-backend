import { createApp } from './app.js';
import { createBotClient } from './bot/client.js';
import { registerCommands } from './bot/registerCommands.js';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled promise rejection', reason);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', error);
});

async function bootstrap() {
  const app = createApp();

  app.listen(env.port, '0.0.0.0', () => {
    logger.info(`HTTP server listening on ${env.port}`);
  });

  try {
    logger.info('Starting bot initialization...');

    registerCommands()
      .then(() => {
        logger.info('Slash commands registered successfully');
      })
      .catch((err) => {
        logger.error('Failed to register commands', err);
      });

    try {
      logger.info('Testing outbound connection to Discord API...');
      const gatewayResponse = await fetch('https://discord.com/api/v10/gateway');
      logger.info(`Discord API status: ${gatewayResponse.status}`);
      const gatewayBody = await gatewayResponse.text();
      logger.info(`Discord API response preview: ${gatewayBody.slice(0, 200)}`);
    } catch (error) {
      logger.error('Failed to reach Discord API', error);
    }

    try {
      const token = env.discordToken.trim();
      logger.info(`DISCORD_TOKEN length: ${token.length}`);
      logger.info('Testing bot token against Discord REST API...');

      const meResponse = await fetch('https://discord.com/api/v10/users/@me', {
        headers: {
          Authorization: `Bot ${token}`
        }
      });

      logger.info(`Discord /users/@me status: ${meResponse.status}`);
      const meBody = await meResponse.text();
      logger.info(`Discord /users/@me response preview: ${meBody.slice(0, 300)}`);
    } catch (error) {
      logger.error('Failed to test bot token against Discord REST API', error);
    }

    logger.info('About to initialize Discord bot client');
    await createBotClient();
    logger.info('Bot client created');
  } catch (error) {
    logger.error('Error during bot startup sequence', error);
  }
}

bootstrap().catch((error) => {
  logger.error('Failed to bootstrap Judge', error);
  process.exit(1);
});