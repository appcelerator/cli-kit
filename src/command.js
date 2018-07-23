import Context from './context';
import E from './errors';
import helpCommand from './help';
import Option from './option';

import { declareCLIKitClass } from './util';

/**
 * Matches all non alphabet, numeric, dash, and underscore characters.
 * @type {RegExp}
 */
const scrubNameRegExp = /[^A-Za-z0-9_-]+/g;

/**
 * Defines a command and its options and arguments.
 *
 * @extends {Context}
 */
export default class Command extends Context {
	/**
	 * Constructs a command instance.
	 *
	 * @param {String} name - The command name.
	 * @param {Object} [params] - Various command options.
	 * @param {Function} [params.action] - A function to call when the command is found.
	 * @param {Array.<String>|String} [params.aliases] - An array of command aliases.
	 * @access public
	 */
	constructor(name, params = {}) {
		if (!name || typeof name !== 'string') {
			throw E.INVALID_ARGUMENT('Expected name to be a non-empty string', { name: 'name', scope: 'Command.constructor', value: name });
		}

		if (!params || typeof params !== 'object' || Array.isArray(params)) {
			throw E.INVALID_ARGUMENT('Expected command parameters to be an object', { name: 'params', scope: 'Command.constructor', value: params });
		}

		if (params.clikit instanceof Set) {
			// params is a cli-kit object
			if (params.clikit.has('CLI')) {
				// since a command cannot have a title "global" (only a `CLI` object can have that),
				// we must delete it so that the title is reset to the command name
				if (params.title === 'Global') {
					delete params.title;
				}

				// add an action handler that eitehr executes a specific command or the help for
				// for this command (e.g. this command is an extension)
				params.action = async parser => {
					const { defaultCommand } = params;
					if (defaultCommand === 'help' && this.get('help')) {
						await helpCommand.action(parser);
					} else {
						const cmd = defaultCommand && this.commands[defaultCommand];
						if (cmd) {
							return cmd.action(parser);
						}
					}
				};
			} else if (!params.clikit.has('Command')) {
				// must be a command or extension
				throw E.INVALID_CLIKIT_OBJECT('Expected command options to be a CLI or Command object', { name: 'params.clikit', scope: 'Command.constructor', value: params.clikit });
			}

		} else {
			// not a cli-kit object

			// process the aliases
			const aliases = {};
			if (params.aliases) {
				if (!Array.isArray(params.aliases)) {
					params.aliases = [ params.aliases ];
				}
				for (const alias of params.aliases) {
					if (!alias || typeof alias !== 'string') {
						throw E.INVALID_ARGUMENT('Expected command aliases to be an array of strings', { name: 'params.aliases.alias', scope: 'Command.constructor', value: alias });
					}
					aliases[alias] = 1;
				}
			}
			params.aliases = aliases;
		}

		if (params.action && typeof params.action !== 'function') {
			throw E.INVALID_ARGUMENT('Expected command action to be a function', { name: 'params.action', scope: 'Command.constructor', value: params.action });
		}

		// ensure we have a title
		params.title || (params.title = name);

		// scrub the name
		params.name = name.replace(scrubNameRegExp, '_');

		super(params);
		declareCLIKitClass(this, 'Command');
	}
}
