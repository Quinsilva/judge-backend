import { AttachmentBuilder, ChannelType } from 'discord.js';
import { eventEmbed } from '../embeds/eventEmbed.js';
import {
  createEvent,
  getEvent,
  getUpcomingEvents,
  markReminderSent,
  updateEvent
} from '../repositories/eventRepo.js';
import {
  ensureGuildChannelConfig,
  ensureGuildRoleConfig
} from '../repositories/guildRepo.js';
import {
  invalidateGuildConfig,
  loadGuildConfig
} from './guildConfigService.js';

async function tryRenderEventCard(payload) {
  try {
    const mod = await import('../renderers/renderEventCard.js');
    return await mod.renderEventCard(payload);
  } catch (error) {
    console.error('Event card render failed:', error);
    return null;
  }
}

async function tryRenderReminderNote(payload) {
  try {
    const mod = await import('../renderers/renderEventReminderNote.js');
    return await mod.renderEventReminderNote(payload);
  } catch (error) {
    console.error('Event reminder note render failed:', error);
    return null;
  }
}

function isImageAttachment(attachment) {
  return Boolean(
    attachment &&
      typeof attachment.url === 'string' &&
      typeof attachment.contentType === 'string' &&
      attachment.contentType.startsWith('image/')
  );
}

function formatDisplayDateTime(dateText, timeText) {
  if (!dateText || !timeText) return '-';

  const value = new Date(`${dateText}T${timeText}:00`);
  if (Number.isNaN(value.getTime())) {
    return `${dateText} ${timeText}`;
  }

  const month = value.toLocaleString('en-US', { month: 'short' });
  const day = value.getDate();
  const year = value.getFullYear();
  const hour = value.toLocaleString('en-US', {
    hour: 'numeric',
    hour12: true
  });

  return `${month}, ${day}, ${year} at ${hour}`;
}

function formatEventTimeLabel(payload) {
  const start = formatDisplayDateTime(payload.startDateText, payload.startTimeText);

  if (payload.endDateText && payload.endTimeText) {
    const end = formatDisplayDateTime(payload.endDateText, payload.endTimeText);
    return `${start} → ${end}${payload.timezone ? ` ${payload.timezone}` : ''}`;
  }

  if (payload.endDateText && payload.endDateText !== payload.startDateText) {
    return `${start} → ${payload.endDateText}${payload.timezone ? ` ${payload.timezone}` : ''}`;
  }

  return `${start}${payload.timezone ? ` ${payload.timezone}` : ''}`;
}

function parseDateTime(dateText, timeText) {
  if (!dateText || !timeText) return null;

  const value = new Date(`${dateText}T${timeText}:00`);
  if (Number.isNaN(value.getTime())) {
    throw new Error('Invalid event date/time.');
  }

  return value.toISOString();
}

async function sendEventMessage(channel, content, embedPayload, renderPayload) {
  const embed = eventEmbed(embedPayload);
  const imageBuffer = await tryRenderEventCard(renderPayload);

  if (imageBuffer) {
    try {
      const file = new AttachmentBuilder(imageBuffer, { name: 'event-card.png' });
      embed.setImage('attachment://event-card.png');

      const message = await channel.send({
        content,
        embeds: [embed],
        files: [file]
      });

      return { message, usedImage: true };
    } catch (error) {
      console.error('Event send with image failed, falling back to embed-only:', error);
    }
  }

  const message = await channel.send({
    content,
    embeds: [embed]
  });

  return { message, usedImage: false };
}

async function editEventMessage(message, embedPayload, renderPayload) {
  const embed = eventEmbed(embedPayload);
  const imageBuffer = await tryRenderEventCard(renderPayload);

  if (imageBuffer) {
    try {
      const file = new AttachmentBuilder(imageBuffer, { name: 'event-card.png' });
      embed.setImage('attachment://event-card.png');

      const updated = await message.edit({
        embeds: [embed],
        files: [file]
      });

      return { message: updated, usedImage: true };
    } catch (error) {
      console.error('Event edit with image failed, falling back to embed-only:', error);
    }
  }

  const updated = await message.edit({
    embeds: [embed],
    files: []
  });

  return { message: updated, usedImage: false };
}

export async function postEvent(interaction, payload) {
  const autoCreated = [];

  const ensuredChannel = await ensureGuildChannelConfig(
    interaction.guildId,
    'events',
    interaction.channelId
  );

  if (ensuredChannel.created) {
    autoCreated.push(
      `Created Firestore path guilds/${interaction.guildId}/channels/events and defaulted it to this channel.`
    );
  }

  const ensuredRole = await ensureGuildRoleConfig(
    interaction.guildId,
    'tester',
    null
  );

  if (ensuredRole.created) {
    autoCreated.push(
      `Created Firestore path guilds/${interaction.guildId}/roles/tester with roleId: null.`
    );
  }

  invalidateGuildConfig(interaction.guildId);
  const guildConfig = await loadGuildConfig(interaction.guildId, { forceRefresh: true });

  const channelId = guildConfig?.channels?.events?.channelId;
  if (!channelId) {
    throw new Error('Events channel exists now, but channelId is still null. Set it in Firestore and try again.');
  }

  const channel = await interaction.guild.channels.fetch(channelId).catch(() => null);
  if (!channel) {
    throw new Error('The configured events channel could not be found.');
  }

  if (
    channel.type !== ChannelType.GuildText &&
    channel.type !== ChannelType.GuildAnnouncement
  ) {
    throw new Error('The configured events channel is not a text channel.');
  }

  const mentionRoleId = payload.mentionTesters
    ? guildConfig?.roles?.tester?.roleId
    : null;

  const content = mentionRoleId ? `<@&${mentionRoleId}>` : undefined;

  const voiceChannelId = payload.voiceChannel?.id || null;
  const voiceChannelName = payload.voiceChannel?.name || null;

  const imageUrl = isImageAttachment(payload.image) ? payload.image.url : null;
  const thumbnailUrl = isImageAttachment(payload.thumbnail) ? payload.thumbnail.url : null;

  const renderPayload = {
    ...payload,
    image: isImageAttachment(payload.image) ? payload.image : null,
    thumbnail: isImageAttachment(payload.thumbnail) ? payload.thumbnail : null,
    voiceChannelName,
    mentionRoleId
  };

  const embedPayload = {
    ...payload,
    image: imageUrl,
    thumbnail: thumbnailUrl,
    voiceChannelName,
    mentionRoleId,
    eventTimeLabel: formatEventTimeLabel(payload)
  };

  const sendResult = await sendEventMessage(channel, content, embedPayload, renderPayload);

  const eventId = await createEvent(interaction.guildId, {
    title: payload.title,
    description: payload.description,
    startDateText: payload.startDateText,
    startTimeText: payload.startTimeText,
    endDateText: payload.endDateText,
    endTimeText: payload.endTimeText,
    timezone: payload.timezone,
    startTime: payload.startTimeIso,
    endTime: payload.endTimeIso,
    status: 'scheduled',
    theme: payload.theme,
    imageUrl,
    thumbnailUrl,
    voiceChannelId,
    voiceChannelName,
    mentionRoleId,
    targetChannelId: channelId,
    discordMessageId: sendResult.message.id,
    createdByUserId: interaction.user.id,
    usedImageCard: sendResult.usedImage,
    remindersSent: {
      t60: false,
      t15: false,
      t5: false
    }
  });

  return {
    message: sendResult.message,
    eventId,
    usedImage: sendResult.usedImage,
    autoCreated
  };
}

export async function editEvent(interaction, eventId, patch) {
  const existing = await getEvent(interaction.guildId, eventId);
  if (!existing) {
    throw new Error('Event not found.');
  }

  const startDateText = patch.startDateText ?? existing.startDateText;
  const startTimeText = patch.startTimeText ?? existing.startTimeText;
  const endDateText = patch.endDateText ?? existing.endDateText;
  const endTimeText = patch.endTimeText ?? existing.endTimeText;

  const startTimeIso = parseDateTime(startDateText, startTimeText);
  const endTimeIso = endDateText && endTimeText
    ? parseDateTime(endDateText, endTimeText)
    : null;

  const voiceChannelId =
    patch.voiceChannel === undefined
      ? existing.voiceChannelId
      : (patch.voiceChannel?.id || null);

  const voiceChannelName =
    patch.voiceChannel === undefined
      ? existing.voiceChannelName
      : (patch.voiceChannel?.name || null);

  const imageUrl =
    patch.image === undefined
      ? existing.imageUrl
      : (isImageAttachment(patch.image) ? patch.image.url : null);

  const thumbnailUrl =
    patch.thumbnail === undefined
      ? existing.thumbnailUrl
      : (isImageAttachment(patch.thumbnail) ? patch.thumbnail.url : null);

  const merged = {
    ...existing,
    title: patch.title ?? existing.title,
    description: patch.description ?? existing.description,
    startDateText,
    startTimeText,
    endDateText,
    endTimeText,
    timezone: patch.timezone ?? existing.timezone,
    status: patch.status ?? existing.status,
    theme: patch.theme ?? existing.theme,
    voiceChannelId,
    voiceChannelName,
    imageUrl,
    thumbnailUrl,
    startTimeIso,
    endTimeIso
  };

  const targetChannel = await interaction.guild.channels
    .fetch(existing.targetChannelId)
    .catch(() => null);

  if (!targetChannel) {
    throw new Error('The original event channel could not be found.');
  }

  if (
    targetChannel.type !== ChannelType.GuildText &&
    targetChannel.type !== ChannelType.GuildAnnouncement
  ) {
    throw new Error('The original event channel is not editable as a text channel.');
  }

  const originalMessage = await targetChannel.messages
    .fetch(existing.discordMessageId)
    .catch(() => null);

  if (!originalMessage) {
    throw new Error('The original event message could not be found.');
  }

  const renderPayload = {
    ...merged,
    image: patch.image === undefined
      ? (existing.imageUrl ? { url: existing.imageUrl, contentType: 'image/png' } : null)
      : (isImageAttachment(patch.image) ? patch.image : null),
    thumbnail: patch.thumbnail === undefined
      ? (existing.thumbnailUrl ? { url: existing.thumbnailUrl, contentType: 'image/png' } : null)
      : (isImageAttachment(patch.thumbnail) ? patch.thumbnail : null)
  };

  const embedPayload = {
    ...merged,
    image: imageUrl,
    thumbnail: thumbnailUrl,
    eventTimeLabel: formatEventTimeLabel(merged)
  };

  const editResult = await editEventMessage(originalMessage, embedPayload, renderPayload);

  await updateEvent(interaction.guildId, eventId, {
    title: merged.title,
    description: merged.description,
    startDateText: merged.startDateText,
    startTimeText: merged.startTimeText,
    endDateText: merged.endDateText,
    endTimeText: merged.endTimeText,
    timezone: merged.timezone,
    startTime: startTimeIso,
    endTime: endTimeIso,
    status: merged.status,
    theme: merged.theme,
    imageUrl,
    thumbnailUrl,
    voiceChannelId,
    voiceChannelName,
    usedImageCard: editResult.usedImage
  });

  return {
    message: editResult.message,
    usedImage: editResult.usedImage
  };
}

export async function listUpcomingEventSummaries(guildId, max = 5) {
  const events = await getUpcomingEvents(guildId, max);

  return events.map((event) => ({
    ...event,
    displayTime: formatEventTimeLabel({
      startDateText: event.startDateText,
      startTimeText: event.startTimeText,
      endDateText: event.endDateText,
      endTimeText: event.endTimeText,
      timezone: event.timezone
    })
  }));
}

export async function listUpcomingEvents(guildId, max = 5) {
  return listUpcomingEventSummaries(guildId, max);
}

export async function buildReminderPayload(event, minutesBefore) {
  return {
    title: event.title,
    description: event.description,
    minutesBefore,
    theme: event.theme || 'cyan',
    startDateText: event.startDateText,
    startTimeText: event.startTimeText,
    endDateText: event.endDateText,
    endTimeText: event.endTimeText,
    timezone: event.timezone,
    voiceChannelName: event.voiceChannelName,
    imageUrl: event.imageUrl,
    thumbnailUrl: event.thumbnailUrl
  };
}

export async function renderReminderAttachment(event, minutesBefore) {
  const payload = await buildReminderPayload(event, minutesBefore);
  const imageBuffer = await tryRenderReminderNote(payload);

  if (!imageBuffer) {
    return null;
  }

  return new AttachmentBuilder(imageBuffer, {
    name: `event-reminder-${minutesBefore}.png`
  });
}

export async function recordReminderSent(guildId, eventId, key) {
  await markReminderSent(guildId, eventId, key);
}