import Context from './context';
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
	 * @param {Object} [opts] - Various command options.
	 * @param {Function} [opts.action] - A function to call when the command is found.
	 * @param {Array.<String>} [opts.aliases] - An array of command aliases.
	 * @access public
	 */
	constructor(name, opts = {}) {
		if (!name || typeof name !== 'string') {
			throw new TypeError('Expected name to be a non-empty string');
		}

		if (!opts || typeof opts !== 'object' || Array.isArray(opts)) {
			throw new TypeError('Expected command options to be an object');
		}

		if (opts.clikit instanceof Set) {
			// opts is a cli-kit object
			if (opts.clikit.has('CLI')) {
				if (opts.title === 'Global') {
					delete opts.title;
				}

				const { defaultCommand } = opts;
				opts.action = (...args) => {
					if (defaultCommand === 'help' && this.get('help')) {
						this.renderHelp();
						const helpExitCode = this.get('helpExitCode', opts.helpExitCode);
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
			} else if (!opts.clikit.has('Command')) {
				throw new TypeError('Expected command options to be a CLI or Command object');
			}

		} else {
			// not a cli-kit object

			// process the aliases
			const aliases = {};
			if (opts.aliases) {
				if (!Array.isArray(opts.aliases)) {
					throw new TypeError('Expected command aliases to be an array of strings');
				}
				for (const alias of opts.aliases) {
					if (!alias || typeof alias !== 'string') {
						throw new TypeError('Expected command aliases to be an array of strings');
					}
					aliases[alias] = 1;
				}
			}
			opts.aliases = aliases;
		}

		if (opts.action && typeof opts.action !== 'function') {
			throw new TypeError('Expected command action to be a function');
		}

		opts.title || (opts.title = name);

		opts.name = name.replace(/[^A-Za-z0-9_-]+/g, '_');

		super(opts);
		declareCLIKitClass(this, 'Command');
	}
}
