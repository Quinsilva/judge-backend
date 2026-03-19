import { firestore } from '../firebase/admin.js';

export async function createRelease(guildId, payload) {
  const ref = await firestore.collection('guilds').doc(guildId).collection('releases').add({
    ...payload,
    createdAt: new Date().toISOString()
  });
  return ref.id;
}

export async function getLatestRelease(guildId, status) {
  let query = firestore.collection('guilds').doc(guildId).collection('releases').orderBy('createdAt', 'desc').limit(1);
  if (status) {
    query = firestore.collection('guilds').doc(guildId).collection('releases').where('status', '==', status).orderBy('createdAt', 'desc').limit(1);
  }
  const snap = await query.get();
  return snap.empty ? null : { id: snap.docs[0].id, ...snap.docs[0].data() };
}
