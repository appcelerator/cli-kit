import E from './errors';

/**
 * Encapsulates a parsed argument.
 */
export default class ParsedArgument {
	/**
	 * Sets the parsed argument type and its data.
	 *
	 * @param {String} type - The parsed argument type such as `option` or `command`.
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
	 * Builds a string describing this parsed argument.
	 *
	 * @returns {String}
	 * @access public
	 */
	toString() {
		let desc = '';

		switch (this.type) {
			case 'command':
				desc = this.command && this.command.name;
				break;
			case 'option':
				desc = this.option && this.option.name;
				break;
			default:
				desc = this.name || this.value;
		}

		return `[parsed ${this.type}${desc ? `: ${desc}` : ''}]`;
	}
}
