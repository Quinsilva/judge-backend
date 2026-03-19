import { firestore } from '../firebase/admin.js';

const guildCollection = firestore.collection('guilds');

export async function getGuildConfig(guildId) {
  const guildDoc = await guildCollection.doc(guildId).get();
  const channelSnap = await guildCollection.doc(guildId).collection('channels').get();
  const roleSnap = await guildCollection.doc(guildId).collection('roles').get();

  return {
    id: guildId,
    ...(guildDoc.exists ? guildDoc.data() : {}),
    channels: Object.fromEntries(channelSnap.docs.map((doc) => [doc.id, doc.data()])),
    roles: Object.fromEntries(roleSnap.docs.map((doc) => [doc.id, doc.data()]))
  };
}

export async function upsertGuildConfig(guildId, data) {
  await guildCollection.doc(guildId).set(
    {
      ...data,
      updatedAt: new Date().toISOString()
    },
    { merge: true }
  );
}
