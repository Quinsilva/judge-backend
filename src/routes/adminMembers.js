import express from 'express';
import { getBotClient, isBotReady, getLastBotError } from '../bot/botInstance.js';
import { requireAdminSession } from './adminAuth.js';

const router = express.Router();

router.get('/members', requireAdminSession, async (req, res) => {
  try {
    if (!isBotReady()) {
      const lastError = getLastBotError();

      return res.status(503).json({
        ok: false,
        error: 'Judge bot is not connected to Discord right now.',
        details: lastError ? lastError.message : 'Bot is still starting'
      });
    }

    const client = getBotClient();

    return res.json({
      ok: true,
      botTag: client.user?.tag ?? null
    });
  } catch (error) {
    console.error('[members] failed:', error);
    return res.status(500).json({
      ok: false,
      error: 'Failed to load members.'
    });
  }
});

export default router;