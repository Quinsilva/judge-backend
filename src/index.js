import { createApp } from './app.js';
import { createBotClient } from './bot/client.js';
import { registerCommands } from './bot/registerCommands.js';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';

async function bootstrap() {
  // 1. Initialize the Express app first
  const app = createApp();

  // 2. Start listening IMMEDIATELY to satisfy Render's port scan
  // Ensure env.port is using process.env.PORT and binding to 0.0.0.0
  app.listen(env.port, () => {
    logger.info(`HTTP server listening on ${env.port}`);
  });

  // 3. Now perform the "heavy" bot initialization tasks
  try {
    logger.info('Starting bot initialization...');
    
    // Register commands in the background so they don't block the health check
    registerCommands().then(() => {
      logger.info('Slash commands registered successfully');
    }).catch(err => {
      logger.error('Failed to register commands', err);
    });

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