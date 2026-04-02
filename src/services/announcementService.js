import { AttachmentBuilder, ChannelType } from 'discord.js';
import { announcementEmbed } from '../embeds/announcementEmbed.js';

async function tryRenderAnnouncementCard(payload) {
  try {
    const mod = await import('../renderers/renderAnnouncementCard.js');
    return await mod.renderAnnouncementCard(payload);
  } catch (error) {
    console.error('Announcement card render failed:', error);
    return null;
  }
}

function resolveTargetChannel(interaction, selectedChannel) {
  return selectedChannel || interaction.channel;
}

function isImageAttachment(attachment) {
  if (!attachment) return false;
  return typeof attachment.contentType === 'string' &&
    attachment.contentType.startsWith('image/');
}

export async function postAnnouncement(interaction, payload) {
  const targetChannel = resolveTargetChannel(interaction, payload.channel);

  if (!targetChannel) {
    throw new Error('No target channel was available for this announcement.');
  }

  if (
    targetChannel.type !== ChannelType.GuildText &&
    targetChannel.type !== ChannelType.GuildAnnouncement
  ) {
    throw new Error('Announcements can only be posted to a text or announcement channel.');
  }

  const imageUrl = isImageAttachment(payload.image) ? payload.image.url : null;
  const thumbnailUrl = isImageAttachment(payload.thumbnail) ? payload.thumbnail.url : null;

  const embed = announcementEmbed({
    ...payload,
    image: imageUrl,
    thumbnail: thumbnailUrl
  });

  if (thumbnailUrl) {
    embed.setThumbnail(thumbnailUrl);
  }

  if (imageUrl) {
    embed.setImage(imageUrl);
  }

  const imageBuffer = await tryRenderAnnouncementCard(payload);

  if (imageBuffer) {
    try {
      const file = new AttachmentBuilder(imageBuffer, { name: 'announcement-card.png' });
      embed.setImage('attachment://announcement-card.png');

      const message = await targetChannel.send({
        embeds: [embed],
        files: [file]
      });

      return { message, usedImage: true };
    } catch (error) {
      console.error('Announcement send with image failed, falling back to embed-only:', error);
    }
  }

  const fallbackMessage = await targetChannel.send({
    embeds: [embed]
  });

  return { message: fallbackMessage, usedImage: false };
}