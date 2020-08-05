import Argument from './argument';

import { declareCLIKitClass } from '../lib/util';

/**
 * Stores a list of `Argument` instances that have been registered for a context.
 *
 * @extends {Array}
 */
export default class ArgumentList extends Array {
	/**
	 * Declares the class name.
	 *
	 * @access public
	 */
	constructor() {
		super();
		declareCLIKitClass(this, 'ArgumentList');
	}

	/**
	 * Adds an argument to the list.
	 *
	 * @param {Object|String|Argument|ArgumentList|Array<Object|String|Argument>} arg - An object
	 * of argument names to argument descriptors, an argument name, an `Argument` instance, an
	 * `ArgumentList` instance, or array of object descriptors, argument names, and `Argument`
	 * instances.
	 * @access public
	 */
	add(arg) {
		const args = Array.isArray(arg) ? arg : [ arg ];
		this.push.apply(this, args.map(a => new Argument(a)));
	}

	/**
	 * Returns the number of arguments.
	 *
	 * @returns {Number}
	 * @access public
	 */
	get count() {
		return this.args.length;
	}

	/**
	 * Generates an object containing the arguments for the help screen.
	 *
	 * @returns {Object}
	 * @access public
	 */
	generateHelp() {
		const entries = [];

		for (const { desc, hidden, hint, multiple, name, required } of this) {
			if (!hidden) {
				entries.push({
					desc,
					hint,
					multiple,
					name,
					required
				});
			}
		}

		return {
			count: entries.length,
			entries
		};
	}
}
