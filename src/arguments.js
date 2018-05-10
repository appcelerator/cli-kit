import { declareCLIKitClass } from './util';

/**
 * A collection of parsed CLI arguments.
 */
export default class Arguments {
	/**
	 * Creates an arguments collection instance.
	 *
	 * @param {Array} [args] - An array of arguments to inject into this instance.
	 * @access public
	 */
	constructor(args) {
		if (args && !Array.isArray(args)) {
			throw new TypeError('Expected args to be an array');
		}

		Object.defineProperties(this, {
			args: {
				value: args || [],
				writable: true
			},
			contexts: {
				value: []
			},
			argv: {
				enumerable: true,
				value: {}
			},
			_: {
				enumerable: true,
				value: []
			}
		});

		declareCLIKitClass(this, 'Arguments');
	}

	/**
	 * Removes undefined arguments. There are cases where an argument and the next argument
	 * containing the value are consolidated and the value argument becomes undefined which needs to
	 * be pruned after parsing is complete.
	 *
	 * @returns {Arguments}
	 * @access public
	 */
	prune() {
		this.args = this.args.filter(x => x);
		return this;
	}

	/**
	 * Returns a reconstruction of `process.argv`.
	 *
	 * @returns {Array.<String>}
	 * @access public
	 */
	valueOf() {
		return this.args.map(arg => arg.toString());
	}

	/**
	 * Reconstructs the arguments into a string.
	 *
	 * @returns {String}
	 * @access public
	 */
	toString() {
		return this.valueOf().join(' ');
	}
}
