import cron from 'node-cron';
import { logger } from '../utils/logger.js';

export function registerSchedulers(client) {
  cron.schedule('0 18 * * 5', async () => {
    logger.info('Weekly prompt scheduler tick');
    void client;
  });
}
