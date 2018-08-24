import { declareCLIKitClass } from '../lib/util';

/**
 * Stores a map of `Command` instances that have been registered for a context.
 *
 * @extends {Map}
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
	 * Generates an object containing the commands for the help screen.
	 *
	 * @returns {Object}
	 * @access public
	 */
	generateHelp() {
		const entries = [];

		for (const cmd of Array.from(this.keys()).sort()) {
			const { aliases, desc, hidden, name } = this.get(cmd);
			if (!hidden) {
				entries.push({
					name,
					desc,
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
