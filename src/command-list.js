import { declareCLIKitClass } from './util';

/**
 * Stores a map of `Command` instances that have been registered for a context.
 */
export default class CommandList extends Map {
	/**
	 * Declares the class name.
	 *
	 * @access public
	 */
	constructor() {
		super();
		declareCLIKitClass(this, 'CommandList');
	}

	/**
	 * Adds a command to the list.
	 *
	 * @param {Command} cmd - The command to add.
	 * @access public
	 */
	add(cmd) {
		this.set(cmd.name, cmd);
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
	 * Returns a sorted list of command names.
	 *
	 * @returns {Array.<String>}
	 * @access public
	 */
	keys() {
		return super.keys.sort();
	}
}
