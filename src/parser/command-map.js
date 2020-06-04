import E from '../lib/errors';
import fs from 'fs';
import path from 'path';

import { declareCLIKitClass } from '../lib/util';

let Command;

/**
 * Matches
 *
 * @type {RegExp}
 */
const jsRegExp = /^(.+)\.js$/;

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
	 * @returns {Array.<Command>}
	 * @access public
	 */
	add(cmd, params) {
		if (!cmd) {
			throw E.INVALID_ARGUMENT('Invalid command', { name: 'cmd', scope: 'CommandMap.add', value: cmd });
		}

		if (!Command) {
			Command = require('./command').default;
		}

		if (params !== undefined) {
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

			if (it instanceof Command) {
				cmd = it;
			} else if (typeof it === 'string') {
				// path
				it = path.resolve(it);

				try {
					const stat = fs.statSync(it);
					const dir = stat.isDirectory() ? it : '';
					const files = dir ? fs.readdirSync(it) : [ it ];
					let m;
					for (const filename of files) {
						if (m = filename.match(jsRegExp)) {
							const module = require(path.join(dir, filename));
							cmd = new Command(m[1], module.__esModule ? module.default : module);
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
				const labels = [ name ];
				for (const [ alias, display ] of Object.entries(aliases)) {
					if (display === 'visible') {
						labels.push(alias);
					}
				}
				labels.sort((a, b) => {
					return a.length === b.length ? a.localeCompare(b) : a.length - b.length;
				});

				entries.push({
					name,
					desc,
					label: labels.join(', '),
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
