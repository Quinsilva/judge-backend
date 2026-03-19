import { storage } from '../firebase/admin.js';

export async function uploadBuffer(path, buffer, contentType) {
  const file = storage.file(path);
  await file.save(buffer, {
    metadata: { contentType },
    resumable: false
  });
  await file.makePublic().catch(() => null);
  return `https://storage.googleapis.com/${storage.name}/${path}`;
}
