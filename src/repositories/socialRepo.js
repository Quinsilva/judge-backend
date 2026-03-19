import { firestore } from '../firebase/admin.js';

export async function hasSocialPost(guildId, source, externalPostId) {
  const snap = await firestore
    .collection('guilds')
    .doc(guildId)
    .collection('socialPosts')
    .where('source', '==', source)
    .where('externalPostId', '==', externalPostId)
    .limit(1)
    .get();

  return !snap.empty;
}

export async function saveSocialPost(guildId, payload) {
  const ref = await firestore.collection('guilds').doc(guildId).collection('socialPosts').add({
    ...payload,
    postedAt: new Date().toISOString()
  });
  return ref.id;
}
