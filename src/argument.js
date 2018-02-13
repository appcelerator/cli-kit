import { checkType, transformValue } from './types';

/**
 * Captures the argument name if it contains `<` and `>` to signify the argument is required.
 * @type {RegExp}
 */
const nameRegExp = /^\s*(?:<(.+)>|\[(.+)\])\s*$/;

/**
 * Defines a argument.
 */
export default class Argument {
	/**
	 * Creates an argument descriptor.
	 *
	 * @param {String|Object} [nameOrParams] - Various parameters. If value is a `String`, then see
	 * `params.name` below for usage.
	 * @param {Function} [params.callback] - ?????????????????????????????
	 * @param {String} [params.desc] - The description of the argument used in the help output.
	 * @param {Boolean} [params.hidden=false] - When `true`, the argument is not displayed on the
	 * help screen or auto-suggest.
	 * @param {String} [params.name] - The name of the argument. If the name is wrapped in angle
	 * brackets (`<`, `>`), then the brackets are trimmed off and the argument is flagged as
	 * required (unless `params.required` is explicitly set to `false`). If the name is wrapped in
	 * square brackets (`[`, `]`), then the brackets are trimmed off.
	 * @param {Boolean} [params.regex] - A regular expression used to validate the value.
	 * @param {Boolean} [params.required=false] - Marks the option value as required.
	 * @param {String} [params.type] - The argument type to coerce the data type into.
	 * @access public
	 */
	constructor(nameOrParams) {
		/*
		{ name: 'path', required: true, regex: /^\//, desc: 'the path to request' },
		{ name: 'json', type: 'json', desc: 'an option JSON payload to send' }
		*/

		let params = nameOrParams;

		if (typeof nameOrParams === 'string') {
			params = {
				name: nameOrParams
			};

		} else if (!nameOrParams) {
			params = {};

		} else if (typeof nameOrParams !== 'object' || Array.isArray(nameOrParams)) {
			throw new TypeError('Expected params to be an object');
		}

		if (!params.name || typeof params.name !== 'string') {
			throw TypeError('Expected argument name to be a non-empty string');
		}

		const m = params.name.match(nameRegExp);
		if (m) {
			if (params.required === undefined && m[1]) {
				params.required = true;
			}
			params.name = (m[1] || m[2]).trim();
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
