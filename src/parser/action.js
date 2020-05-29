import Context from './context';
import E from '../lib/errors';

import { declareCLIKitClass } from '../lib/util';

const actionRegExp = /^(\w+(?:\s*,\s*\w+)*)((?:\s*[<[]\w+[>\]])*)?$/;

export default class Action extends Context {
	constructor(name, params = {}) {
		if (!name || typeof name !== 'string') {
			throw E.INVALID_ARGUMENT('Expected action name to be a non-empty string', { name: 'name', scope: 'Action.constructor', value: name });
		}

		const format = name.trim();

		// parse the name and create the aliases and args: "ls, list <bar>"
		const m = format.match(actionRegExp);
		if (!m || !m[1]) {
			throw E.INVALID_ARGUMENT('Expected action name to be a non-empty string', { name: 'name', scope: 'Action.constructor', value: name });
		}

		if (typeof params === 'function') {
			params = { action: params };
		} else if (typeof params === 'string') {
			params = { desc: params };
		}

		if (!params || (typeof params !== 'object' || Array.isArray(params))) {
			throw E.INVALID_ARGUMENT('Expected action parameters to be an object', { name: 'params', scope: 'Action.constructor', value: params });
		}

		const aliases = new Set();
		for (let alias of m[1].split(',')) {
			if (alias = alias.trim()) {
				if (alias.startsWith('@')) {
					alias = alias.substring(1);
				} else if (!params.name) {
					params.name = alias;
				}
				aliases.add(alias);
			}
		}

		if (!params.name) {
			params.name = 'action';
		}

		const args = m[2] && m[2].trim().split(/\s+/);
		if (args?.length) {
			params.args = params.args ? [ ...args, ...params.args ] : args;
		}

		super(params);
		declareCLIKitClass(this, 'Action');

		this.aliases = aliases;
		this.format = format;
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
			if (value instanceof Set) {
				value = Array.from(value);
			} else if (!Array.isArray(value)) {
				value = [ value ];
			}

			for (const alias of value) {
				if (!alias || typeof alias !== 'string') {
					throw E.INVALID_ARGUMENT('Expected action aliases to be an array of strings', { name: 'aliases.alias', scope: 'Action.constructor', value: alias });
				}

				for (const a of alias.split(/[ ,|]+/)) {
					if (a === '!') {
						throw E.INVALID_ALIAS(`Invalid action alias "${alias}"`, { name: 'aliases', scope: 'Action.constructor', value: alias });
					}
					if (a[0] === '!') {
						result[a.substring(1)] = 'hidden';
					} else {
						result[a] = 'visible';
					}
				}
			}
		}
		this._aliases = result;
	}
}
