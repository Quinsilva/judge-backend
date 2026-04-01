import { EmbedBuilder } from 'discord.js';

const THEME_COLORS = {
  cyan: 0x7eebff,
  red: 0xff6b8a,
  green: 0xa7ff7a,
  purple: 0xb29cff
};

export function announcementEmbed(payload) {
  return new EmbedBuilder()
    .setColor(THEME_COLORS[payload.theme] || THEME_COLORS.cyan)
    .setTitle(`[ ${payload.title} ]`)
    .setDescription([
      `[ PACKET STATUS: RECOVERED ]`,
      payload.summary
    ].join('\n'))
    .addFields(
      {
        name: '[ ARCHIVE LOG ]',
        value: payload.body
      },
      ...(payload.link
        ? [
            {
              name: '[ LINK ]',
              value: payload.link
            }
          ]
        : [])
    )
    .setFooter({
      text: 'JUDGE // OFFICIAL RUN UPDATE // TRACE ACTIVE'
    })
    .setTimestamp();
}