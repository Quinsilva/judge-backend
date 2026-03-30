let botClient = null;
let botReady = false;
let lastBotError = null;

export function setBotClient(client) {
  botClient = client;
}

export function clearBotClient() {
  botClient = null;
  botReady = false;
}

export function markBotReady(value) {
  botReady = Boolean(value);
}

export function setLastBotError(error) {
  lastBotError = error ?? null;
}

export function getLastBotError() {
  return lastBotError;
}

export function isBotReady() {
  return Boolean(botClient) && botReady && botClient.isReady();
}

export function getBotClient() {
  if (!botClient) {
    throw new Error('Bot client has not been initialized yet');
  }

  if (!botReady || !botClient.isReady()) {
    throw new Error('Bot client is not ready yet');
  }

  return botClient;
}