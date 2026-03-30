let botClient = null;

export function setBotClient(client) {
  botClient = client;
}

export function getBotClient() {
  if (!botClient) {
    throw new Error('Bot client has not been initialized yet');
  }

  if (!botClient.isReady()) {
    throw new Error('Bot client is not ready yet');
  }

  return botClient;
}