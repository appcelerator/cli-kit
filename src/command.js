import Context from './context';
import E from './errors';
import Option from './option';

import { declareCLIKitClass } from './util';

/**
 * Defines a command and its options and arguments.
 */
export default class Command extends Context {
	/**
	 * Constructs a command instance.
	 *
	 * @param {String} name - The command name.
	 * @param {Object} [params] - Various command options.
	 * @param {Function} [params.action] - A function to call when the command is found.
	 * @param {Array.<String>} [params.aliases] - An array of command aliases.
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
				if (params.title === 'Global') {
					delete params.title;
				}

				const { defaultCommand } = params;
				params.action = (...args) => {
					if (defaultCommand === 'help' && this.get('help')) {
						this.renderHelp();
						const helpExitCode = this.get('helpExitCode', params.helpExitCode);
						if (helpExitCode !== undefined) {
							process.exit(helpExitCode);
						}
					} else {
						const cmd = defaultCommand && this.commands[defaultCommand];
						if (cmd) {
							return cmd.action(...args);
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
					throw E.INVALID_ARGUMENT('Expected command aliases to be an array of strings', { name: 'params.aliases', scope: 'Command.constructor', value: params.aliases });
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

		params.title || (params.title = name);

		params.name = name.replace(/[^A-Za-z0-9_-]+/g, '_');

		super(params);
		declareCLIKitClass(this, 'Command');
	}
}
