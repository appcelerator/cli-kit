import { declareCLIKitClass, maxKeyLength, wrap } from './util';

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
	 * Generates an object containing information about the commands for the help screen.
	 *
	 * @type {Object}
	 * @access public
	 */
	get data() {
		const rows = [];
		const maxWidths = [];
		const setMax = (col, str) => maxWidths[col] = Math.max(maxWidths[col] || 0, str.length);

		for (const name of this.keys().sort()) {
			const cmd = this.get(name);

			rows.push({
				name: cmd.name,
				desc: cmd.desc
			});

			setMax(0, cmd.name);
			setMax(0, cmd.desc);
		}

		return {
			rows,
			title: 'Commands',
			maxWidths
		};
	}
}
