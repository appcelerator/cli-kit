import debug from '../lib/debug';

const { highlight, note } = debug.styles;

/**
 * Command and option lookup for faster resolution.
 */
export default class Lookup {
	/**
	 * A map of action names and aliases to action instances.
	 *
	 * @type {Object}
	 */
	actions = {};

	/**
	 * A map of command names and aliases to command instances.
	 *
	 * @type {Object}
	 */
	commands = {};

	/**
	 * A map of extension names and aliases to extension instances.
	 *
	 * @type {Object}
	 */
	extensions = {};

	/**
	 * A map of long option names and aliases to option instances.
	 *
	 * @type {Object}
	 */
	long = {};

	/**
	 * A map of short option names and aliases to option instances.
	 *
	 * @type {Object}
	 */
	short = {};

	/**
	 * Determines if the lookup is empty.
	 *
	 * @type {Boolean}
	 */
	get empty() {
		return !Object.keys(this.commands).length && !Object.keys(this.long).length && !Object.keys(this.short).length;
	}

	/**
	 * Renders the lookups to a string.
	 *
	 * @returns {String}
	 * @access public
	 */
	toString() {
		const lines = [];

		if (Object.keys(this.actions).length) {
			lines.push(note('  Actions:'));
			for (const name of Object.keys(this.actions)) {
				lines.push(`    ${highlight(name)}`);
			}
		}

		if (Object.keys(this.commands).length) {
			lines.push(note('  Commands:'));
			for (const name of Object.keys(this.commands)) {
				lines.push(`    ${highlight(name)} => ${highlight(this.commands[name].name)}`);
			}
		}

		if (Object.keys(this.long).length || Object.keys(this.short).length) {
			lines.push(note('  Options:'));
			for (const name of Object.keys(this.long)) {
				lines.push(`    ${highlight(`--${name}`)} => ${highlight(this.long[name].name)}`);
			}
			for (const name of Object.keys(this.short)) {
				lines.push(`    ${highlight(`-${name}`)} => ${highlight(this.short[name].name)}`);
			}
		}

		return lines.length ? lines.join('\n') : '';
	}
}
