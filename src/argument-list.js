import Argument from './argument';

import { declareCLIKitClass } from './util';

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
	 * @param {Argument|Object} arg - The argument to add.
	 * @access public
	 */
	add(arg) {
		this.push(arg instanceof Argument ? arg : new Argument(arg));
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

		for (const { desc, hidden, multiple, name, required } of this) {
			if (!hidden) {
				entries.push({
					name,
					desc,
					required,
					multiple
				});
			}
		}

		return {
			count: entries.length,
			entries
		};
	}
}
