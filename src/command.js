import Context from './context';
import Option from './option';

/**
 * Defines a command and its options and arguments.
 */
export default class Command extends Context {
	/**
	 * Constructs a command instance.
	 *
	 * @param {String} name - The command name.
	 * @param {Object} [params] - Various params.
	 * @param {Function} [params.action] - A function to call when the command is found.
	 * @param {Array<String>} [params.aliases] - An array of command aliases.
	 * @param {Array<Object>} [params.args] - An array of arguments.
	 * @param {Boolean} [params.camelCase=true] - Camel case option names.
	 * @param {Array<Object>} [params.commands] - An array of commands.
	 * @param {String} [params.desc] - The description of the command displayed in the help output.
	 * @param {Boolean} [params.hidden=false] - When `true`, the command will not be displayed on
	 * the help screen or auto-suggest.
	 * @param {Array<Object>} [params.options] - An array of options definition objects.
	 * @param {Context} [params.parent] - Parent context.
	 * @param {String} [params.title] - Context title.
	 * @access public
	 */
	constructor(name, params = {}) {
		if (!name || typeof name !== 'string') {
			throw new TypeError('Expected name to be a string');
		}

		if (typeof params !== 'object' || Array.isArray(params)) {
			throw new TypeError('Expected argument to be an object or Context');
		}

		if (params.action && typeof params.action !== 'function') {
			throw new TypeError('Expected action to be a function');
		}

		// process the aliases
		const aliases = {};
		if (params.aliases) {
			if (!Array.isArray(params.aliases)) {
				throw new TypeError('Expected aliases to be an array of strings');
			}
			for (const alias of params.aliases) {
				if (!alias || typeof alias !== 'string') {
					throw new TypeError('Expected aliases to be an array of strings');
				}
				aliases[alias] = 1;
			}
		}

		super(params);

		this.action  = params.action;
		this.aliases = aliases;
		this.name    = name;
		this.title   = params.title || name;
	}
}
