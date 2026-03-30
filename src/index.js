import { createApp } from './app.js';
import { createBotClient } from './bot/client.js';
import { registerCommands } from './bot/registerCommands.js';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';

async function bootstrap() {
  const app = createApp();
  app.listen(env.port, '0.0.0.0', () => {
    logger.info(`HTTP server listening on ${env.port}`);
  });
  await registerCommands();
  createBotClient();
}

bootstrap().catch((error) => {
  logger.error('Failed to bootstrap Judge', error);
  process.exit(1);
});
