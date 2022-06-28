import E from '../lib/errors.js';
import fs from 'fs';
import path from 'path';
import { declareCLIKitClass } from '../lib/util.js';

let Command;

/**
 * Matches
 *
 * @type {RegExp}
 */
const jsRegExp = /\.js$/;

/**
 * Stores a map of `Command` instances that have been registered for a context.
 *
 * @extends {Map}
 */
export default class CommandMap extends Map {
	/**
	 * Declares the class name.
	 *
	 * @access public
	 */
	constructor() {
		super();
		declareCLIKitClass(this, 'CommandMap');
	}

	/**
	 * Adds a command to the map.
	 *
	 * @param {Object|String|Command|CommandMap|Array.<Object|String|Command>} cmd - An object used
	 * for `Command` constructor params, a path to a directory or a `.js` file, a `Command`
	 * instance, or an array of those types. May also be a `CommandMap` instance. If `cmd` is a
	 * `String` and `params` is present, then it will treat `cmd` as the command name, not a file
	 * path.
	 * @param {Object|Function} [params] - When `cmd` is the command name, then this is the options
	 * to pass into the `Command` constructor.
	 * @param {Boolean} [clone] - When `true` and `cmd` is a `Command` or `CommandMap`, it will
	 * clone the `Command` instead of set by reference.
	 * @returns {Array.<Command>}
	 * @access public
	 */
	add(cmd, params, clone) {
		if (!cmd) {
			throw E.INVALID_ARGUMENT('Invalid command', { name: 'cmd', scope: 'CommandMap.add', value: cmd });
		}

		if (!Command) {
			Command = require('./command').default;
		}

		if (params !== undefined && params !== null) {
			if (typeof cmd !== 'string') {
				throw E.INVALID_ARGUMENT('Command parameters are only allowed when command is a string', { name: 'cmd', scope: 'CommandMap.add', value: { cmd, params } });
			} else if (typeof params === 'function') {
				params = { action: params };
			} else if (typeof params !== 'object') {
				throw E.INVALID_ARGUMENT('Expected command parameters to be an object or function', { name: 'params', scope: 'CommandMap.add', value: { cmd, params } });
			}
			cmd = new Command(cmd, params);
		}

		const results = [];
		const commands = typeof cmd === 'object' && cmd.clikit instanceof Set && (cmd.clikit.has('CommandList') || cmd.clikit.has('CommandMap')) ?
			cmd.values() :
			Array.isArray(cmd) ? cmd : [ cmd ];

		for (let it of commands) {
			cmd = null;

			if (!clone && it instanceof Command) {
				cmd = it;
			} else if (typeof it === 'string') {
				// path
				it = path.resolve(it);

				try {
					const files = fs.statSync(it).isDirectory() ? fs.readdirSync(it).map(filename => path.join(it, filename)) : [ it ];
					for (const file of files) {
						if (jsRegExp.test(file)) {
							cmd = new Command(file);
							this.set(cmd.name, cmd);
							results.push(cmd);
						}
					}
				} catch (e) {
					if (e.code === 'ENOENT') {
						throw E.FILE_NOT_FOUND(`Command path does not exist: ${it}`, { name: 'command', scope: 'CommandMap.add', value: it });
					}
					throw e;
				}

				continue;

			} else if (it && typeof it === 'object') {
				// ctor params or Command-like
				if (it.clikit instanceof Set) {
					if (it.clikit.has('Extension')) {
						// actions and extensions not supported here
						continue;
					} else if (it.clikit.has('Command')) {
						cmd = new Command(it.name, it);
					} else {
						throw E.INVALID_COMMAND(`Invalid command: cli-kit type "${Array.from(it.clikit)[0]}" not supported`, { name: 'command', scope: 'CommandMap.add', value: it });
					}
				} else if (it.name && typeof it.name === 'string') {
					// the object is command ctor params
					cmd = new Command(it.name, it);
				} else {
					// an object of command names to a path, ctor params, Command object, or Command-like object

					for (const [ name, value ] of Object.entries(it)) {
						cmd = new Command(name, value);
						this.set(cmd.name, cmd);
						results.push(cmd);
					}

					continue;
				}
			}

			if (cmd instanceof Command) {
				this.set(cmd.name, cmd);
				results.push(cmd);
			} else {
				throw E.INVALID_ARGUMENT(`Invalid command "${it}", expected an object`, { name: 'command', scope: 'CommandMap.add', value: it });
			}
		}

		return results;
	}

	/**
	 * Returns the number of commands.
	 *
	 * @returns {Number}
	 * @access public
	 */
	get count() {
		return this.size;
	}

	/**
	 * Generates an object containing the commands for the help screen.
	 *
	 * @returns {Object}
	 * @access public
	 */
	generateHelp() {
		const entries = [];

		for (const cmd of Array.from(this.keys())) {
			const { aliases, clikitHelp, desc, hidden, name } = this.get(cmd);
			if (!hidden && !clikitHelp) {
				const labels = new Set([ name ]);

				for (const [ alias, display ] of Object.entries(aliases)) {
					if (display === 'visible') {
						labels.add(alias);
					}
				}

				entries.push({
					name,
					desc,
					label: Array.from(labels).sort((a, b) => {
						return a.length === b.length ? a.localeCompare(b) : a.length - b.length;
					}).join(', '),
					aliases: aliases ? Object.keys(aliases) : null
				});
			}
		}

		entries.sort((a, b) => a.label.localeCompare(b.label));

		return {
			count: entries.length,
			entries
		};
	}
}
