import { Router } from 'express';
import { getGuildConfig, upsertGuildConfig } from '../repositories/guildRepo.js';

export const configRouter = Router();

configRouter.get('/guilds/:guildId/config', async (req, res, next) => {
  try {
    const config = await getGuildConfig(req.params.guildId);
    res.json(config);
  } catch (error) {
    next(error);
  }
});

configRouter.put('/guilds/:guildId/config', async (req, res, next) => {
  try {
    await upsertGuildConfig(req.params.guildId, req.body);
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});
