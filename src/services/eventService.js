import { AttachmentBuilder, ChannelType } from 'discord.js';
import { eventEmbed } from '../embeds/eventEmbed.js';
import {
  createEvent,
  getUpcomingEvents,
  markReminderSent
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

function formatEventTimeLabel(payload) {
  const start = `${payload.startDateText} ${payload.startTimeText}`;
  const endDate = payload.endDateText || payload.startDateText;

  if (payload.endTimeText) {
    return `${start} → ${endDate} ${payload.endTimeText}${payload.timezone ? ` ${payload.timezone}` : ''}`;
  }

  if (payload.endDateText && payload.endDateText !== payload.startDateText) {
    return `${start} → ${payload.endDateText}${payload.timezone ? ` ${payload.timezone}` : ''}`;
  }

  return `${start}${payload.timezone ? ` ${payload.timezone}` : ''}`;
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