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

function formatSchedule(payload) {
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