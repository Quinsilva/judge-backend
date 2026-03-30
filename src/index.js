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

  logger.info('Starting bot initialization...');

  registerCommands()
    .then(() => {
      logger.info('Slash commands registered successfully');
    })
    .catch((err) => {
      logger.error('Failed to register commands', err);
    });

  try {
    await createBotClient();
  } catch (error) {
    logger.error('Initial Discord startup failed', error);
  }
}

bootstrap().catch((error) => {
  logger.error('Failed to bootstrap Judge', error);
  process.exit(1);
});