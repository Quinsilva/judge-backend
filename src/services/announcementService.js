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

  const embed = announcementEmbed(payload);

  if (payload.thumbnail) {
    embed.setThumbnail(payload.thumbnail);
  }

  if (payload.image) {
    embed.setImage(payload.image);
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