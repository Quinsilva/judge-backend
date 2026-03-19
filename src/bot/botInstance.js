let botClient = null;

export function setBotClient(client) {
  botClient = client;
}

export function getBotClient() {
  if (!botClient) {
    throw new Error('Bot client not initialized');
  }
  return botClient;
}