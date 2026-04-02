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

  return (
    typeof attachment.url === 'string' &&
    typeof attachment.contentType === 'string' &&
    attachment.contentType.startsWith('image/')
  );
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

  const renderPayload = {
    ...payload,
    image: isImageAttachment(payload.image) ? payload.image : null,
    thumbnail: isImageAttachment(payload.thumbnail) ? payload.thumbnail : null
  };

  const embedPayload = {
    ...payload,
    image: imageUrl,
    thumbnail: thumbnailUrl
  };

  const embed = announcementEmbed(embedPayload);

  const imageBuffer = await tryRenderAnnouncementCard(renderPayload);

  if (imageBuffer) {
    try {
      const file = new AttachmentBuilder(imageBuffer, {
        name: 'announcement-card.png'
      });

      embed.setImage('attachment://announcement-card.png');

      const message = await targetChannel.send({
        embeds: [embed],
        files: [file]
      });

      return {
        message,
        usedImage: true
      };
    } catch (error) {
      console.error('Announcement send with image failed, falling back to embed-only:', error);
    }
  }

  const fallbackMessage = await targetChannel.send({
    embeds: [embed]
  });

  return {
    message: fallbackMessage,
    usedImage: false
  };
}