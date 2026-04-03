import { firestore } from '../firebase/admin.js';

function eventsCollection(guildId) {
  return firestore.collection('guilds').doc(guildId).collection('events');
}

export async function createEvent(guildId, payload) {
  const ref = eventsCollection(guildId).doc();
  const now = new Date().toISOString();

  await ref.set({
    eventId: ref.id,
    title: payload.title,
    description: payload.description,
    startDateText: payload.startDateText,
    startTimeText: payload.startTimeText,
    endDateText: payload.endDateText || null,
    endTimeText: payload.endTimeText || null,
    timezone: payload.timezone || 'UTC',
    startTime: payload.startTime,
    endTime: payload.endTime || null,
    status: payload.status || 'scheduled',
    theme: payload.theme || 'cyan',
    imageUrl: payload.imageUrl || null,
    thumbnailUrl: payload.thumbnailUrl || null,
    voiceChannelId: payload.voiceChannelId || null,
    voiceChannelName: payload.voiceChannelName || null,
    mentionRoleId: payload.mentionRoleId || null,
    targetChannelId: payload.targetChannelId,
    discordMessageId: payload.discordMessageId,
    createdByUserId: payload.createdByUserId,
    usedImageCard: Boolean(payload.usedImageCard),
    remindersSent: payload.remindersSent || {
      t60: false,
      t15: false,
      t5: false
    },
    createdAt: now,
    updatedAt: now
  });

  return ref.id;
}

export async function updateEvent(guildId, eventId, patch) {
  await eventsCollection(guildId)
    .doc(eventId)
    .set(
      {
        ...patch,
        updatedAt: new Date().toISOString()
      },
      { merge: true }
    );
}

export async function getEvent(guildId, eventId) {
  const snap = await eventsCollection(guildId).doc(eventId).get();
  if (!snap.exists) return null;

  return {
    id: snap.id,
    ...snap.data()
  };
}

export async function getUpcomingEvents(guildId, max = 5) {
  const now = new Date().toISOString();

  const snap = await eventsCollection(guildId)
    .where('status', '==', 'scheduled')
    .where('startTime', '>=', now)
    .orderBy('startTime', 'asc')
    .limit(max)
    .get();

  return snap.docs.map((doc) => ({
    id: doc.id,
    ...doc.data()
  }));
}

export async function getReminderCandidates(guildId, minutesBefore, max = 20) {
  const now = Date.now();
  const lowerBound = new Date(now + (minutesBefore - 1) * 60_000).toISOString();
  const upperBound = new Date(now + minutesBefore * 60_000).toISOString();

  const snap = eventsCollection(guildId)
    .where('status', '==', 'scheduled')
    .where('startTime', '>=', lowerBound)
    .where('startTime', '<=', upperBound)
    .orderBy('startTime', 'asc')
    .limit(max);

  const result = await snap.get();

  return result.docs.map((doc) => ({
    id: doc.id,
    ...doc.data()
  }));
}

export async function markReminderSent(guildId, eventId, key) {
  await eventsCollection(guildId)
    .doc(eventId)
    .set(
      {
        [`remindersSent.${key}`]: true,
        updatedAt: new Date().toISOString()
      },
      { merge: true }
    );
}