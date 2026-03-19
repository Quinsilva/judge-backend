import { firestore } from '../firebase/admin.js';

export async function createEvent(guildId, payload) {
  const ref = await firestore.collection('guilds').doc(guildId).collection('events').add({
    ...payload,
    createdAt: new Date().toISOString()
  });
  return ref.id;
}

export async function getUpcomingEvents(guildId, max = 5) {
  const now = new Date().toISOString();
  const snap = await firestore
    .collection('guilds')
    .doc(guildId)
    .collection('events')
    .where('startTime', '>=', now)
    .orderBy('startTime', 'asc')
    .limit(max)
    .get();
  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}
