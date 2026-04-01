import { firestore } from '../firebase/admin.js';

const guildCollection = firestore.collection('guilds');

export async function getGuildConfig(guildId) {
  const guildRef = guildCollection.doc(guildId);

  const [guildDoc, channelSnap, roleSnap] = await Promise.all([
    guildRef.get(),
    guildRef.collection('channels').get(),
    guildRef.collection('roles').get()
  ]);

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

export async function ensureGuildChannelConfig(guildId, key, channelId, extra = {}) {
  const ref = guildCollection.doc(guildId).collection('channels').doc(key);
  const snap = await ref.get();

  if (!snap.exists) {
    const payload = {
      channelId: channelId ?? null,
      createdAt: new Date().toISOString(),
      autoCreated: true,
      ...extra
    };

    await ref.set(payload, { merge: true });
    return { created: true, value: payload };
  }

  return { created: false, value: snap.data() };
}

export async function ensureGuildRoleConfig(guildId, key, roleId = null, extra = {}) {
  const ref = guildCollection.doc(guildId).collection('roles').doc(key);
  const snap = await ref.get();

  if (!snap.exists) {
    const payload = {
      roleId,
      createdAt: new Date().toISOString(),
      autoCreated: true,
      ...extra
    };

    await ref.set(payload, { merge: true });
    return { created: true, value: payload };
  }

  return { created: false, value: snap.data() };
}

export async function ensureRewardsConfig(guildId) {
  const ref = guildCollection.doc(guildId).collection('config').doc('rewards');
  const snap = await ref.get();

  if (!snap.exists) {
    const payload = {
      mediaSubmissionsEnabled: true,
      approvedChannelIds: [],
      createdAt: new Date().toISOString(),
      autoCreated: true
    };

    await ref.set(payload, { merge: true });
    return { created: true, value: payload };
  }

  return { created: false, value: snap.data() };
}