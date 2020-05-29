import Context from './context';
import debug from '../lib/debug';
import E from '../lib/errors';
import helpCommand from '../commands/help';

import { declareCLIKitClass } from '../lib/util';

/**
 * Defines a command and its options and arguments.
 *
 * @extends {Context}
 */
export default class Command extends Context {
	/**
	 * Internal object for tracking aliases.
	 *
	 * @type {Object}
	 * @private
	 */
	_aliases = {};

	/**
	 * Constructs a command instance.
	 *
	 * @param {String} name - The command name.
	 * @param {Object|CLI|Command|Context|Function} [params] - Command parameters or an action
	 * function.
	 * @param {Function|Command} [params.action] - A function to call when the command is found.
	 * @param {Array.<String>|String} [params.aliases] - An array of command aliases.
	 * @param {String|Function} [params.defaultCommand] - The default command to execute when this
	 * command has no `action`. When value is a `String`, it looks up the subcommand and calls it.
	 * If value is a `Function`, it simply invokes it.
	 * @param {String|Function|Object} [params.help] - Additional help content to display on the
	 * help screen. When may be an object with the properties `header` and `footer` which values
	 * that are either a string or an async function that resolves a string. When value is a string
	 * or function, it is trasnformed into a object with the value being used as the header. Note
	 * that the command description is not displayed when a header message has been defined.
	 * @param {Boolean} [params.hidden=false] - When `true`, the option is not displayed on the
	 * help screen or auto-suggest.
	 * @access public
	 *
	 * @example
	 *   new Command('foo')
	 *   new Command('foo', {})
	 *   new Command(new Command('foo'))
	 */
	constructor(name, params = {}) {
		if (!name || typeof name !== 'string') {
			throw E.INVALID_ARGUMENT('Expected command name to be a non-empty string', { name: 'name', scope: 'Command.constructor', value: name });
		}

		if (typeof params === 'function') {
			params = { action: params };
		}

		if (!params || (typeof params !== 'object' || Array.isArray(params))) {
			throw E.INVALID_ARGUMENT('Expected command parameters to be an object', { name: 'params', scope: 'Command.constructor', value: params });
		}

		if (params.defaultCommand !== undefined && (!params.defaultCommand || (typeof params.defaultCommand !== 'string' && typeof params.defaultCommand !== 'function'))) {
			throw E.INVALID_ARGUMENT('Expected default command to be a string or function', { name: 'defaultCommand', scope: 'Command.constructor', value: params.defaultCommand });
		}

		if (params.clikit instanceof Set) {
			// params is a cli-kit object
			if (params.clikit.has('CLI')) {
				// since a command cannot have a title "global" (only a `CLI` object can have that),
				// we must delete it so that the title is reset to the command name
				if (params.title === 'Global') {
					delete params.title;
				}

				delete params.terminal;

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
				throw E.INVALID_CLIKIT_OBJECT('Expected command options to be a CLI or Command object', { name: 'clikit', scope: 'Command.constructor', value: params.clikit });
			}
		}

		if (params.action && typeof params.action !== 'function' && !(params.action instanceof Command)) {
			throw E.INVALID_ARGUMENT('Expected command action to be a function or Command instance', { name: 'action', scope: 'Command.constructor', value: params.action });
		}

		const help = {};
		if (params.help) {
			if (typeof params.help === 'string' || typeof params.help === 'function') {
				help.header = params.help;
			} else if (typeof params.help === 'object') {
				if (params.help.header) {
					if (typeof params.help.header === 'string' || typeof params.help.header === 'function') {
						help.header = params.help.header;
					} else {
						throw E.INVALID_ARGUMENT('Expected help content header to be a string or function');
					}
				}
				if (params.help.footer) {
					if (typeof params.help.footer === 'string' || typeof params.help.footer === 'function') {
						help.footer = params.help.footer;
					} else {
						throw E.INVALID_ARGUMENT('Expected help content footer to be a string or function');
					}
				}
			} else {
				throw E.INVALID_ARGUMENT('Expected help content to be a string, function, or object containing a header or footer');
			}
		}

		params.name = name;

		super(params);
		declareCLIKitClass(this, 'Command');

		if (params.action) {
			this.action = params.action;
		} else if (typeof params.defaultCommand === 'function') {
			this.action = params.defaultCommand;
		} else if (typeof params.defaultCommand === 'string') {
			this.action = this.lookup.commands[params.defaultCommand];
		}

		this.aliases        = params.aliases;
		this.clikitHelp     = params.clikitHelp;
		this.help           = help;
		this.defaultCommand = params.defaultCommand;
		this.hidden         = !!params.hidden;
	}

	/**
	 * A map of aliases an whether they are visible.
	 *
	 * @type {Object}
	 * @access public
	 */
	get aliases() {
		return this._aliases;
	}

	set aliases(value) {
		const result = {};
		if (value) {
			if (typeof value === 'object' && !Array.isArray(value)) {
				Object.assign(result, value);
			} else {
				if (value instanceof Set) {
					value = Array.from(value);
				} else if (!Array.isArray(value)) {
					value = [ value ];
				}

				for (const alias of value) {
					if (!alias || typeof alias !== 'string') {
						throw E.INVALID_ARGUMENT('Expected command aliases to be an array of strings', { name: 'aliases.alias', scope: 'Command.constructor', value: alias });
					}

					for (const a of alias.split(/[ ,|]+/)) {
						if (a === '!') {
							throw E.INVALID_ALIAS(`Invalid command alias "${alias}"`, { name: 'aliases', scope: 'Command.constructor', value: alias });
						}
						if (a[0] === '!') {
							result[a.substring(1)] = 'hidden';
						} else {
							result[a] = 'visible';
						}
					}
				}
			}
		}
		this._aliases = result;
	}

	/**
	 * Renders the help screen for this context including the parent contexts.
	 *
	 * @returns {Promise<Object>}
	 * @access private
	 */
	generateHelp() {
		this.on('generateHelp', async results => {
			const opts = {
				style: debug.styles
			};
			results.header = typeof this.help.header === 'function' ? await this.help.header.call(this, opts) : this.help.header;
			results.footer = typeof this.help.footer === 'function' ? await this.help.footer.call(this, opts) : this.help.footer;
		});

		return super.generateHelp();
	}

	/**
	 * Returns the schema for this command and all child contexts.
	 *
	 * @returns {Object}
	 * @access public
	 */
	schema() {
		return {
			desc: this.desc
		};
	}
}
