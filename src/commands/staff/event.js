import { SlashCommandBuilder, ChannelType } from 'discord.js';
import { postEvent } from '../../services/eventService.js';
import { requireStaffRole } from '../../utils/staffAuth.js';

export const data = new SlashCommandBuilder()
  .setName('event')
  .setDescription('Create a scheduled event announcement.')
  .addStringOption((option) =>
    option.setName('title').setDescription('Event title').setRequired(true)
  )
  .addStringOption((option) =>
    option.setName('description').setDescription('Event description').setRequired(true)
  )
  .addStringOption((option) =>
    option
      .setName('start_date')
      .setDescription('Start date in YYYY-MM-DD format')
      .setRequired(true)
  )
  .addStringOption((option) =>
    option
      .setName('start_time')
      .setDescription('Start time in HH:MM 24-hour format')
      .setRequired(true)
  )
  .addStringOption((option) =>
    option
      .setName('end_date')
      .setDescription('Optional end date in YYYY-MM-DD format')
      .setRequired(false)
  )
  .addStringOption((option) =>
    option
      .setName('end_time')
      .setDescription('Optional end time in HH:MM 24-hour format')
      .setRequired(false)
  )
  .addStringOption((option) =>
    option
      .setName('timezone')
      .setDescription('IANA timezone, e.g. Europe/London')
      .setRequired(false)
  )
  .addChannelOption((option) =>
    option
      .setName('voice_channel')
      .setDescription('Optional associated voice channel')
      .addChannelTypes(ChannelType.GuildVoice, ChannelType.GuildStageVoice)
      .setRequired(false)
  )
  .addAttachmentOption((option) =>
    option
      .setName('image')
      .setDescription('Optional event banner image')
      .setRequired(false)
  )
  .addAttachmentOption((option) =>
    option
      .setName('thumbnail')
      .setDescription('Optional event thumbnail image')
      .setRequired(false)
  )
  .addStringOption((option) =>
    option
      .setName('theme')
      .setDescription('Visual event theme')
      .addChoices(
        { name: 'Neon Cyan', value: 'cyan' },
        { name: 'Warning Red', value: 'red' },
        { name: 'Toxic Green', value: 'green' },
        { name: 'Signal Purple', value: 'purple' }
      )
      .setRequired(false)
  )
  .addBooleanOption((option) =>
    option
      .setName('mention_testers')
      .setDescription('Mention the tester role if configured')
      .setRequired(false)
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

    const title = interaction.options.getString('title', true);
    const description = interaction.options.getString('description', true);
    const startDateText = interaction.options.getString('start_date', true);
    const startTimeText = interaction.options.getString('start_time', true);
    const endDateInput = interaction.options.getString('end_date');
    const endTimeText = interaction.options.getString('end_time');
    const timezone = interaction.options.getString('timezone') || 'UTC';

    const startDate = parseDate(startDateText);
    const startDateTime = parseDateTime(startDateText, startTimeText);

    let endDateText = endDateInput || startDateText;
    let endDate = parseDate(endDateText);
    let endDateTime = null;

    if (endTimeText) {
      endDateTime = parseDateTime(endDateText, endTimeText);
      if (endDateTime.getTime() <= startDateTime.getTime()) {
        await interaction.editReply({
          content: 'End date/time must be after start date/time.'
        });
        return;
      }
    } else if (endDate.getTime() < startDate.getTime()) {
      await interaction.editReply({
        content: 'End date cannot be before start date.'
      });
      return;
    }

    const result = await postEvent(interaction, {
      title,
      description,
      startDateText,
      startTimeText,
      endDateText: endTimeText || endDateInput ? endDateText : null,
      endTimeText: endTimeText || null,
      timezone,
      startTimeIso: startDateTime.toISOString(),
      endTimeIso: endDateTime ? endDateTime.toISOString() : null,
      voiceChannel: interaction.options.getChannel('voice_channel'),
      image: interaction.options.getAttachment('image'),
      thumbnail: interaction.options.getAttachment('thumbnail'),
      theme: interaction.options.getString('theme') || 'cyan',
      mentionTesters: interaction.options.getBoolean('mention_testers') ?? false
    });

    await interaction.editReply({
      content: [
        `Event posted in <#${result.message.channelId}>.`,
        result.usedImage
          ? 'Digitized event card uploaded successfully.'
          : 'Event posted with embed-only fallback.',
        ...result.autoCreated
      ].join('\n')
    });
  } catch (error) {
    console.error('Error running /event:', error);

    if (interaction.deferred || interaction.replied) {
      await interaction.editReply({
        content: error.message || 'Something went wrong while posting the event.'
      }).catch(() => {});
    } else {
      await interaction.reply({
        ephemeral: true,
        content: error.message || 'Something went wrong while posting the event.'
      }).catch(() => {});
    }
  }
}