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
	 * Generates an object containing the options for the help screen.
	 *
	 * @returns {Object}
	 * @access public
	 */
	generateHelp() {
		let count = 0;
		const groups = {};
		const sortFn = (a, b) => {
			return a.order < b.order ? -1 : a.order > b.order ? 1 : a.name.localeCompare(b.name);
		};

		for (const [ groupName, options ] of this.entries()) {
			const group = groups[groupName] = [];
			for (const opt of options.sort(sortFn)) {
				if (!opt.hidden) {
					group.push({
						name:     opt.name,
						format:   opt.format,
						desc:     opt.desc,
						datatype: opt.datatype,
						aliases:  Object.keys(opt.aliases),
						default:  opt.default,
						max:      opt.max,
						min:      opt.min,
						required: opt.required
					});
					count++;
				}
			}
		}

		return {
			count,
			groups
		};
	}
}
