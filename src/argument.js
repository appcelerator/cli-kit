import { types } from './types';

/**
 * Defines a parsed argument.
 */
export default class Argument {
	/**
	 * Creates an argument descriptor.
	 *
	 * @param {Object} [params] - Various parameters.
	 * @param {String} [params.desc] - The description of the argument used in the help display.
	 * @param {String} [params.name] - The name of the argument.
	 * @param {Boolean} [params.regex] - A regular expression used to validate the value.
	 * @param {Boolean} [params.required] - Marks the option value as required.
	 * @param {String} [params.type] - The argument type to coerce the data type into.
	 */
	constructor(params) {
		/*
		{ name: 'path', required: true, regex: /^\//, desc: 'the path to request' },
		{ name: 'json', type: 'json', desc: 'an option JSON payload to send' }
		*/
		if (!params) {
			params = {};
		}
		if (typeof params !== 'object' || Array.isArray(params)) {
			throw new TypeError('Expected params to be an object');
		}

		if (params.type && !types[params.type]) {
			throw new Error(`Unsupported type "${params.type}"`);
		}

		Object.assign(this, params);

		// TODO: params.regex

		this.required = !!params.required;
		this.type     = params.type || 'string';
	}

	/**
	 * Transforms the given argument value based on its type.
	 *
	 * @param {*} value - The value to transform.
	 * @returns {*}
	 */
	transform(value) {
		if (typeof types[this.type].transform === 'function') {
			value = types[this.type].transform(value);
		}

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
