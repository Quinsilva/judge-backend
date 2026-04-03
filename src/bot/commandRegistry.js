import * as play from '../commands/public/play.js';
import * as links from '../commands/public/links.js';
import * as latest from '../commands/public/latest.js';
import * as events from '../commands/public/events.js';
import * as announce from '../commands/staff/announce.js';
import * as release from '../commands/staff/release.js';
import * as playtest from '../commands/staff/playtest.js';
import * as event from '../commands/staff/event.js';
import * as status from '../commands/staff/status.js';
import * as link from '../commands/public/link.js';
import * as submitmedia from '../commands/public/submitmedia.js';
import * as eventEdit from '../commands/staff/event-edit.js';

export const commands = [play, links, latest, events, announce, release, playtest, event, status, link, submitmedia, eventEdit];
export const commandMap = new Map(commands.map((command) => [command.data.name, command]));
