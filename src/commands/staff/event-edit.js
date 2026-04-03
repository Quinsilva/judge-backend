import { SlashCommandBuilder, ChannelType } from 'discord.js';
import { editEvent } from '../../services/eventService.js';
import { requireStaffRole } from '../../utils/staffAuth.js';

export const data = new SlashCommandBuilder()
  .setName('event-edit')
  .setDescription('Edit an existing scheduled event.')
  .addStringOption((option) =>
    option
      .setName('event_id')
      .setDescription('Firestore event ID')
      .setRequired(true)
  )
  .addStringOption((option) =>
    option.setName('title').setDescription('Updated title')
  )
  .addStringOption((option) =>
    option.setName('description').setDescription('Updated description')
  )
  .addStringOption((option) =>
    option
      .setName('start_date')
      .setDescription('Updated start date in YYYY-MM-DD format')
  )
  .addStringOption((option) =>
    option
      .setName('start_time')
      .setDescription('Updated start time in HH:MM 24-hour format')
  )
  .addStringOption((option) =>
    option
      .setName('end_date')
      .setDescription('Updated end date in YYYY-MM-DD format')
  )
  .addStringOption((option) =>
    option
      .setName('end_time')
      .setDescription('Updated end time in HH:MM 24-hour format')
  )
  .addStringOption((option) =>
    option
      .setName('timezone')
      .setDescription('Updated timezone, e.g. Europe/London')
  )
  .addChannelOption((option) =>
    option
      .setName('voice_channel')
      .setDescription('Updated associated voice channel')
      .addChannelTypes(ChannelType.GuildVoice, ChannelType.GuildStageVoice)
  )
  .addAttachmentOption((option) =>
    option
      .setName('image')
      .setDescription('Updated event banner image')
  )
  .addAttachmentOption((option) =>
    option
      .setName('thumbnail')
      .setDescription('Updated event thumbnail image')
  )
  .addStringOption((option) =>
    option
      .setName('theme')
      .setDescription('Updated visual theme')
      .addChoices(
        { name: 'Neon Cyan', value: 'cyan' },
        { name: 'Warning Red', value: 'red' },
        { name: 'Toxic Green', value: 'green' },
        { name: 'Signal Purple', value: 'purple' }
      )
  )
  .addStringOption((option) =>
    option
      .setName('status')
      .setDescription('Updated event status')
      .addChoices(
        { name: 'scheduled', value: 'scheduled' },
        { name: 'live', value: 'live' },
        { name: 'completed', value: 'completed' },
        { name: 'cancelled', value: 'cancelled' }
      )
  );

function parseDate(dateStr) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    throw new Error('Date must be in YYYY-MM-DD format.');
  }

  const value = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(value.getTime())) {
    throw new Error('Invalid date.');
  }

  return value;
}

function parseDateTime(dateStr, timeStr) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    throw new Error('Date must be in YYYY-MM-DD format.');
  }

  if (!/^\d{2}:\d{2}$/.test(timeStr)) {
    throw new Error('Time must be in HH:MM 24-hour format.');
  }

  const value = new Date(`${dateStr}T${timeStr}:00`);
  if (Number.isNaN(value.getTime())) {
    throw new Error('Invalid date or time.');
  }

  return value;
}

export async function execute(interaction) {
  try {
    await interaction.deferReply({ ephemeral: true });

    const allowed = await requireStaffRole(interaction);
    if (!allowed) return;

    const eventId = interaction.options.getString('event_id', true);

    const patch = {
      title: interaction.options.getString('title') ?? undefined,
      description: interaction.options.getString('description') ?? undefined,
      startDateText: interaction.options.getString('start_date') ?? undefined,
      startTimeText: interaction.options.getString('start_time') ?? undefined,
      endDateText: interaction.options.getString('end_date') ?? undefined,
      endTimeText: interaction.options.getString('end_time') ?? undefined,
      timezone: interaction.options.getString('timezone') ?? undefined,
      voiceChannel: interaction.options.getChannel('voice_channel') ?? undefined,
      image: interaction.options.getAttachment('image') ?? undefined,
      thumbnail: interaction.options.getAttachment('thumbnail') ?? undefined,
      theme: interaction.options.getString('theme') ?? undefined,
      status: interaction.options.getString('status') ?? undefined
    };

    const hasAnyUpdate = Object.values(patch).some((value) => value !== undefined);
    if (!hasAnyUpdate) {
      await interaction.editReply({
        content: 'Provide at least one field to update.'
      });
      return;
    }

    if (patch.startDateText) parseDate(patch.startDateText);
    if (patch.endDateText) parseDate(patch.endDateText);

    if (patch.startDateText && patch.startTimeText) {
      parseDateTime(patch.startDateText, patch.startTimeText);
    } else if (patch.startTimeText && !patch.startDateText) {
      // allowed, service will combine with existing start date
    }

    if (patch.endDateText && patch.endTimeText) {
      parseDateTime(patch.endDateText, patch.endTimeText);
    }

    const result = await editEvent(interaction, eventId, patch);

    await interaction.editReply({
      content: [
        `Event updated in <#${result.message.channelId}>.`,
        result.usedImage
          ? 'Updated event card uploaded successfully.'
          : 'Event updated with embed-only fallback.'
      ].join('\n')
    });
  } catch (error) {
    console.error('Error running /event-edit:', error);

    if (interaction.deferred || interaction.replied) {
      await interaction.editReply({
        content: error.message || 'Something went wrong while editing the event.'
      }).catch(() => {});
    } else {
      await interaction.reply({
        ephemeral: true,
        content: error.message || 'Something went wrong while editing the event.'
      }).catch(() => {});
    }
  }
}