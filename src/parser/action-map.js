import E from '../lib/errors';

import { declareCLIKitClass } from '../lib/util';

let Action;

/**
 * Stores a map of `Action` instances that have been registered for a context.
 *
 * @extends {Map}
 */
export default class ActionMap extends Map {
	/**
	 * Declares the class name.
	 *
	 * @access public
	 */
	constructor() {
		super();
		declareCLIKitClass(this, 'ActionMap');
	}

	/**
	 * Adds a command to the map.
	 *
	 * @param {Object|String|Action|ActionMap|Array.<Object|String|Action>} action - An object used
	 * for `Action` constructor params, an `Action` instance, or an array of those types. May also be a `CommandMap` instance. If `cmd` is a
	 * `String` and `params` is present, then it will treat `cmd` as the command name, not a file
	 * path.
	 * @param {Object|Function} [params] - When `action` is the command name, then this is the
	 * options to pass into the `Action` constructor.
	 * @returns {Array.<Action>}
	 * @access public
	 *
	 * @example
	 * add('foo <bar>', ({ console }) => { console.log('foo action fired!', argv.bar); });
	 *
	 * add({
	 *   'foo <bar>': ({ argv, console }) => { console.log('foo action fired!', argv.bar); });
	 * });
	 */
	add(action, params) {
		if (!action) {
			throw E.INVALID_ARGUMENT('Invalid action', { name: 'action', scope: 'ActionMap.add', value: action });
		}

		if (!Action) {
			Action = require('./action').default;
		}

		if (params !== undefined) {
			if (typeof action !== 'string') {
				throw E.INVALID_ARGUMENT('Action parameters are only allowed when action is a string', { name: 'action', scope: 'ActionMap.add', value: { action, params } });
			} else if (typeof params === 'function') {
				params = { action: params };
			} else if (typeof params !== 'object') {
				throw E.INVALID_ARGUMENT('Expected action parameters to be an object or function', { name: 'params', scope: 'ActionMap.add', value: { action, params } });
			}
			action = new Action(action, params);
		}

		const results = [];
		const actions = typeof action === 'object' && action.clikit instanceof Set && action.clikit.has('ActionMap') ?
			action.values() :
			Array.isArray(action) ? action : [ action ];

		for (let it of actions) {
			action = null;

			if (it instanceof Action) {
				action = it;
			} else if (it && typeof it === 'object') {
				// ctor params or Command-like
				if (it.clikit instanceof Set) {
					if (it.clikit.has('Command') || it.clikit.has('Extension')) {
						// commands and extensions not supported here
						continue;
					} else if (it.clikit.has('Action')) {
						action = new Action(it.name, it);
					} else {
						throw E.INVALID_COMMAND(`Invalid command: cli-kit type "${Array.from(it.clikit)[0]}" not supported`, { name: 'action', scope: 'ActionMap.add', value: it });
					}
				} else if (it.name && typeof it.name === 'string') {
					// the object is action ctor params
					action = new Action(it.name, it);
				} else {
					// an object of command names to a path, ctor params, Command object, or Command-like object

					for (const [ name, value ] of Object.entries(it)) {
						action = new Action(name, value);
						this.set(action.name, action);
						results.push(action);
					}

					continue;
				}
			}

			if (action instanceof Action) {
				this.set(action.name, action);
				results.push(action);
			} else {
				throw E.INVALID_ARGUMENT(`Invalid action "${it}", expected an object`, { name: 'action', scope: 'ActionMap.add', value: it });
			}
		}

		return results;
	}

	/**
	 * Returns the number of actions.
	 *
	 * @returns {Number}
	 * @access public
	 */
	get count() {
		return this.size;
	}

	/**
	 * Generates an object containing the actions for the help screen.
	 *
	 * @returns {Object}
	 * @access public
	 */
	generateHelp() {
		const entries = [];

		for (const action of Array.from(this.keys()).sort()) {
			const { aliases, clikitHelp, desc, format, hidden, name } = this.get(action);
			if (!hidden && !clikitHelp) {
				entries.push({
					name,
					desc,
					format,
					aliases: aliases ? Object.keys(aliases) : null
				});
			}
		}

		return {
			count: entries.length,
			entries
		};
	}
}
