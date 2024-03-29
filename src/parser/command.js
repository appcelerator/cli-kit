import Context from './context.js';
import debug from '../lib/debug.js';
import E from '../lib/errors.js';
import fs from 'fs';
import helpCommand from '../commands/help.js';
import path from 'path';
import { declareCLIKitClass } from '../lib/util.js';

const { log } = debug('cli-kit:command');
const { highlight } = debug.styles;

const formatRegExp = /^([@! ]*[\w-_]+(?:\s*,\s*[@! ]*[\w-_]+)*)((?:\s*[<[]~?[\w-_]+[>\]])*)?$/;
const nameRegExp = /^([@! ]*)([\w-_]+)\s*$/;

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
	 * Custom help header and footer content.
	 *
	 * @type {Object}
	 * @access private
	 */
	_help = {};

	/**
	 * Constructs a command instance.
	 *
	 * @param {String} name - The command name or absolute path to a file.
	 * @param {Object|CLI|Command|Context|Function} [params] - Command parameters or an action
	 * function.
	 * @param {Function|Command} [params.action] - A function to call when the command is found.
	 * @param {Set.<String>|Array.<String>|String|Object} [params.aliases] - An array of command
	 * aliases.
	 * @param {Function} [params.callback] - A function to call when the command has been parsed.
	 * @param {String|Function} [params.defaultCommand] - The default command to execute when this
	 * command has no `action`. When value is a `String`, it looks up the subcommand and calls it.
	 * If value is a `Function`, it simply invokes it.
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
		super(null); // null will skip the init since we do it applyParams()
		declareCLIKitClass(this, 'Command');
		this.applyParams(name, params);
	}

	/**
	 * Initializes the command.
	 *
	 * @param {String} name - The command name.
	 * @param {Object} params - Various parameters.
	 * @access private
	 */
	applyParams(name, params) {
		if (name && typeof name === 'string' && path.isAbsolute(name) && fs.existsSync(name)) {
			params.modulePath = name;
			name = path.parse(name).name;
		}

		if (!name || typeof name !== 'string') {
			throw E.INVALID_ARGUMENT('Expected command name to be a non-empty string', { name: 'name', scope: 'Command.constructor', value: name });
		}

		// parse the name and create the aliases and args: "ls, list <bar>"
		const format = name.trim();
		const m = format.match(formatRegExp);
		if (!m || !m[1]) {
			throw E.INVALID_ARGUMENT('Expected command name to be a non-empty string', { name: 'name', scope: 'Command.constructor', value: name });
		}

		if (typeof params === 'function') {
			params = { action: params };
		}

		// reset the name
		name = null;

		// get the aliases from the format and find the command name
		const aliases = new Set();
		for (let alias of m[1].split(',')) {
			const n = alias.match(nameRegExp);
			if (!n) {
				throw E.INVALID_ARGUMENT('Invalid command alias format', { name: 'alias', scope: 'Command.constructor', value: alias });
			}
			if (!n[1].includes('@') && !name) {
				name = n[2];
			} else {
				aliases.add(n[1].includes('!') ? `!${n[2]}` : n[2]);
			}
		}

		if (!name) {
			throw E.INVALID_ARGUMENT('Expected command name format to contain at least one non-aliased name', { name: 'format', scope: 'Command.constructor', value: format });
		}

		if (!params || (typeof params !== 'object' || Array.isArray(params))) {
			throw E.INVALID_ARGUMENT('Expected command parameters to be an object', { name: 'params', scope: 'Command.constructor', value: params });
		}

		if (params.callback && typeof params.callback !== 'function') {
			throw E.INVALID_ARGUMENT('Expected command callback to be a function', { name: 'callback', scop: 'Command.constructor', value: params.callback });
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
							return cmd.action.call(cmd, parser);
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

		params.name = name;

		const args = m[2] && m[2].trim().split(/\s+/);
		if (args?.length) {
			params.args = params.args ? [ ...args, ...params.args ] : args;
		}

		this.init(params);

		if (params.action) {
			this.action = params.action;
		} else if (typeof params.defaultCommand === 'function') {
			this.action = params.defaultCommand;
		} else if (typeof params.defaultCommand === 'string') {
			this.action = this.lookup.commands[params.defaultCommand];
		}

		// mix aliases Set with params.aliases
		this._aliases       = this.createAliases(aliases, params.aliases);
		this.callback       = params.callback;
		this.clikitHelp     = params.clikitHelp;
		this.defaultCommand = params.defaultCommand;
		this.help           = params.help || {};
		this.hidden         = !!params.hidden;
		this.loaded         = !params.modulePath;
		this.modulePath     = params.modulePath;

		// mix in any other custom props
		for (const [ key, value ] of Object.entries(params)) {
			if (!Object.prototype.hasOwnProperty.call(this, key)) {
				this[key] = value;
			}
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
		this._aliases = this.createAliases(value);
	}

	/**
	 * Merges multiple alias constructs into a single alias object.
	 *
	 * @param {...Set.<String>|Array.<String>|String|Object} values - One or more alias values.
	 * @returns {Object}
	 * @access private
	 */
	createAliases(...values) {
		const result = {};

		for (let value of values) {
			if (!value) {
				continue;
			}

			if (value instanceof Set) {
				value = Array.from(value);
			}

			if (typeof value === 'object' && !Array.isArray(value)) {
				Object.assign(result, value);
				continue;
			}

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

		return result;
	}

	/**
	 * Custom help header and footer content. A string, function, or object with `header` and
	 * `footer` properties may be used to set the `help` property, but the internal value will
	 * always be an object with `header` and `footer` properties.
	 *
	 * @type {Object}
	 * @access public
	 */
	get help() {
		return this._help;
	}

	set help(value) {
		if (typeof value === 'string' || typeof value === 'function') {
			this._help.header = value;
		} else if (typeof value === 'object') {
			if (value.header) {
				if (typeof value.header === 'string' || typeof value.header === 'function') {
					this._help.header = value.header;
				} else {
					throw E.INVALID_ARGUMENT('Expected help content header to be a string or function');
				}
			}
			if (value.footer) {
				if (typeof value.footer === 'string' || typeof value.footer === 'function') {
					this._help.footer = value.footer;
				} else {
					throw E.INVALID_ARGUMENT('Expected help content footer to be a string or function');
				}
			}
		} else {
			this._help = {};
		}
	}

	/**
	 * Loads this command if it is defined in an external file.
	 *
	 * @returns {Promise<boolean>} Resolves `true` if it loaded the module, otherwise `false`.
	 * @access public
	 */
	async load() {
		if (this.loaded) {
			return false;
		}

		try {
			log(`Importing ${highlight(this.modulePath)}`);
			let ctx = await import(`file://${this.modulePath}`);
			if (!ctx || typeof ctx !== 'object') {
				throw new Error('Command must export an object');
			}

			// if this is an ES6 module, grab the default export
			if (ctx.default) {
				ctx = ctx.default;
			}

			if (!ctx || typeof ctx !== 'object') {
				throw new Error('Command must export an object');
			}

			this.applyParams(ctx.name || this.name, ctx);
			this.loaded = true;
			return true;
		} catch (err) {
			throw E.INVALID_COMMAND(`Bad command "${this.name}": ${err.message}`, { name: this.name, scope: 'Command.load', value: err });
		}
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
