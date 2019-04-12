import Context from './context';
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
	 * @param {Object|CLI|Command|Context|Function} [params] - Command parameters or an action function.
	 * @param {Function} [params.action] - A function to call when the command is found.
	 * @param {Array.<String>|String} [params.aliases] - An array of command aliases.
	 * @access public
	 *
	 * @example
	 *   new Command('foo')
	 *   new Command('foo', {})
	 *   new Command(new Command('foo'))
	 */
	constructor(name, params = {}) {
		if (!name || typeof name !== 'string') {
			throw E.INVALID_ARGUMENT('Expected name to be a non-empty string', { name: 'name', scope: 'Command.constructor', value: name });
		}

		if (typeof params === 'function') {
			params = { action: params };
		}

		if (!params || (typeof params !== 'object' || Array.isArray(params))) {
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

		if (params.action && typeof params.action !== 'function') {
			throw E.INVALID_ARGUMENT('Expected command action to be a function', { name: 'action', scope: 'Command.constructor', value: params.action });
		}

		params.name = name;

		super(params);
		declareCLIKitClass(this, 'Command');

		if (params.action) {
			this.action = params.action;
		}
		this.aliases = params.aliases;
		if (params.clikitHelp !== undefined) {
			this.clikitHelp = params.clikitHelp;
		}
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
				if (!Array.isArray(value)) {
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
