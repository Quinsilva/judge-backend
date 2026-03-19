import 'dotenv/config';
import admin from 'firebase-admin';

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const projectId = requireEnv('FIREBASE_PROJECT_ID');
const clientEmail = requireEnv('FIREBASE_CLIENT_EMAIL');
const privateKey = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');
const storageBucket = requireEnv('FIREBASE_STORAGE_BUCKET');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey
    }),
    storageBucket
  });
}

const firestore = admin.firestore();
const storage = admin.storage().bucket(storageBucket);

export { admin, firestore, storage };
export default admin;