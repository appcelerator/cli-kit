import { checkType, transformValue } from './types';

/**
 * Defines a parsed argument.
 */
export default class Argument {
	/**
	 * Creates an argument descriptor.
	 *
	 * @param {Object} [params] - Various parameters.
	 * @param {String} [params.desc] - The description of the argument used in the help display.
	 * @param {Boolean} [params.hidden=false] - When `true`, the argument is not displayed on the
	 * help screen or auto-suggest.
	 * @param {String} [params.name] - The name of the argument.
	 * @param {Boolean} [params.regex] - A regular expression used to validate the value.
	 * @param {Boolean} [params.required] - Marks the option value as required.
	 * @param {String|Array.<String>} [params.type] - The argument type to coerce the data type
	 * into.
	 * @access public
	 */
	constructor(params) {
		/*
		{ name: 'path', required: true, regex: /^\//, desc: 'the path to request' },
		{ name: 'json', type: 'json', desc: 'an option JSON payload to send' }
		*/

		if (!params) {
			params = {};
		}

		if (typeof params === 'string') {
			params = {
				name: params
			};
		} else if (typeof params !== 'object' || Array.isArray(params)) {
			throw new TypeError('Expected params to be an object');
		}

		Object.assign(this, params);

		// TODO: params.regex

		this.hidden   = !!params.hidden;
		this.required = !!params.required;
		this.type     = checkType(params.type, 'string');
	}

	/**
	 * Transforms the given argument value based on its type.
	 *
	 * @param {*} value - The value to transform.
	 * @returns {*}
	 * @access public
	 */
	transform(value) {
		value = transformValue(value, this.type);

		switch (this.type) {
			case 'positiveInt':
			case 'int':
			case 'number':
				if (this.min !== null && value < this.min) {
					throw new Error(`Value must be greater than or equal to ${this.min}`);
				}
				if (this.max !== null && value > this.max) {
					throw new Error(`Value must be less than or equal to ${this.max}`);
				}
				break;
		}

		return value;
	}
}
