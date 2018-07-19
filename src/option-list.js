import { declareCLIKitClass } from './util';

/**
 * Stores a map of `Option` instances that have been registered for a context.
 *
 * @extends {Map}
 */
export default class OptionList extends Map {
	/**
	 * An internal counter of options that have been added.
	 *
	 * @type {Number}
	 */
	count = 0;

	/**
	 * Declares the class name.
	 *
	 * @access public
	 */
	constructor() {
		super();
		declareCLIKitClass(this, 'OptionList');
	}

	/**
	 * Adds a option to the list.
	 *
	 * @param {String} group - The option group name.
	 * @param {Option} option - The option to add.
	 * @access public
	 */
	add(group, option) {
		let options = this.get(group);
		if (!options) {
			this.set(group, options = []);
		}
		options.push(option);
		this.count++;
	}

	/**
	 * Renders the list of commands for the help output.
	 *
	 * @param {Object} params - Various parameters.
	 * @param {WritableStream} params.out - The stream to write output to.
	 * @param {Number} params.width - The width of the terminal.
	 * @access public
	 */
	renderHelp({ out, width }) {
		out.write('\nhi from options\n');
	}
}
