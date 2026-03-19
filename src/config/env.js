import 'dotenv/config';

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  discordToken: requireEnv('DISCORD_TOKEN'),
  discordClientId: requireEnv('DISCORD_CLIENT_ID'),
  discordGuildId: requireEnv('DISCORD_GUILD_ID'),
  port: process.env.PORT || '8080',

  firebaseProjectId: requireEnv('FIREBASE_PROJECT_ID'),
  firebaseStorageBucket: requireEnv('FIREBASE_STORAGE_BUCKET'),

  publicSiteUrl: process.env.PUBLIC_SITE_URL || 'https://untitledrun.web.app/',
  adminDashboardUrl: process.env.ADMIN_DASHBOARD_URL || 'http://localhost:5173',
};