import { EmbedBuilder } from 'discord.js';

const THEME_COLORS = {
  cyan: 0x7eebff,
  red: 0xff6b8a,
  green: 0xa7ff7a,
  purple: 0xb29cff
};

function themeColor(theme) {
  return THEME_COLORS[theme] || THEME_COLORS.cyan;
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

function formatSchedule(payload) {
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

export function eventEmbed(payload) {
  const fields = [
    {
      name: 'Schedule',
      value: payload.eventTimeLabel || formatSchedule(payload)
    }
  ];

  if (payload.voiceChannelName) {
    fields.push({
      name: 'Voice Channel',
      value: payload.voiceChannelName
    });
  }

  if (payload.link) {
    fields.push({
      name: 'Link',
      value: payload.link
    });
  }

  const embed = new EmbedBuilder()
    .setColor(themeColor(payload.theme))
    .setTitle(payload.title)
    .setDescription(payload.description)
    .addFields(fields)
    .setFooter({
      text: 'JUDGE // EVENT BROADCAST'
    })
    .setTimestamp(new Date(payload.startTimeIso));

  if (payload.thumbnail) {
    embed.setThumbnail(payload.thumbnail);
  }

  if (payload.image) {
    embed.setImage(payload.image);
  }

  return embed;
}