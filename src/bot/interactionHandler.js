import { Events } from 'discord.js';
import { commandMap } from './commandRegistry.js';
import { logger } from '../utils/logger.js';

export function attachInteractionHandler(client) {
  client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const command = commandMap.get(interaction.commandName);
    if (!command) return;

    try {
      await command.execute(interaction);
    } catch (error) {
      logger.error('Interaction failed', interaction.commandName, error);
      const payload = { content: 'Judge hit an error while processing that command.', ephemeral: true };
      if (interaction.deferred || interaction.replied) {
        await interaction.followUp(payload).catch(() => null);
      } else {
        await interaction.reply(payload).catch(() => null);
      }
    }
  });
}
