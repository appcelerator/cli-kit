import E from './errors';

/**
 * Encapsulates a parsed argument.
 */
export default class ParsedArgument {
	/**
	 * Sets the parsed argument type and its data.
	 *
	 * @param {String} type - The parsed argument type such as `command`, `option`, `extra`, or
	 * `unknown`.
	 * @param {Object} [data] - An optional data payload to mix into this parsed argument instance.
	 * @access public
	 */
	constructor(type, data) {
		if (!type || typeof type !== 'string') {
			throw E.INVALID_ARGUMENT('Expected parsed argument type to be a non-empty string', { name: 'type', scope: 'ParsedArgument.constructor', value: type });
		}

		if (data && typeof data !== 'object') {
			throw E.INVALID_ARGUMENT('Expected parsed argument data to be an object', { name: 'data', scope: 'ParsedArgument.constructor', value: data });
		}

		this.type = type;
		Object.assign(this, data);
	}

	/**
	 * Attempts to form a name of the given parsed argument.
	 *
	 * @returns {String}
	 * @access public
	 */
	getName() {
		let name;
		switch (this.type) {
			case 'command':
				name = this.command && this.command.name;
				break;
			case 'option':
				name = this.option && this.option.name;
				break;
		}
		return name || this.input && this.input[0];
	}

	/**
	 * Builds a string describing this parsed argument.
	 *
	 * @returns {String}
	 * @access public
	 */
	toString() {
		const name = this.getName();
		return `[parsed ${this.type}${name ? `: ${name}` : ''}]`;
	}
}
