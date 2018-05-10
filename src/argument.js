import { checkType, transformValue } from './types';
import { declareCLIKitClass } from './util';

/**
 * Tests if the name contains the required sequence (`<` and `>`).
 * @type {RegExp}
 */
const requiredRegExp = /^\s*(?:<(.+)>|\[(.+)\])\s*(\.\.\.\s*)?$/;

/**
 * Tests if the name contains the multiple sequence.
 * @type {RegExp}
 */
const multipleRegExp = /^(.*)\.\.\.\s*$/;

/**
 * Defines a argument.
 */
export default class Argument {
	/**
	 * Creates an argument descriptor.
	 *
	 * @param {String|Object} [nameOrParams] - Various parameters. If value is a `String`, then see
	 * `params.name` below for usage.
	 * @param {Function} [params.callback] - A function to call when the argument has been
	 * processed. This happens parsing is complete.
	 * @param {String} [params.desc] - The description of the argument used in the help output.
	 * @param {Boolean} [params.hidden=false] - When `true`, the argument is not displayed on the
	 * help screen or auto-suggest.
	 * @param {Boolean} [params.multiple=false] - When `true`, the value becomes an array with all
	 * remaining parsed arguments. Any subsequent argument definitions after a `multiple` argument
	 * are ignored.
	 * @param {String} [params.name] - The name of the argument. If the name is wrapped in angle
	 * brackets (`<`, `>`), then the brackets are trimmed off and the argument is flagged as
	 * required (unless `params.required` is explicitly set to `false`). If the name is wrapped in
	 * square brackets (`[`, `]`), then the brackets are trimmed off. If the name ends with `...`
	 * and `params.multiple` is not specified, then it will set `params.multiple` to `true`.
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

		if (!params || (typeof params !== 'string' && typeof params !== 'object') || Array.isArray(params)) {
			throw new TypeError('Expected argument params to be a non-empty string or an object');
		}

		if (typeof params === 'string') {
			params = {
				name: params.trim()
			};
		}

		if (!params.name || typeof params.name !== 'string') {
			throw TypeError('Expected argument name to be a non-empty string');
		}

		declareCLIKitClass(this, 'Argument');

		if (params.clikit instanceof Set && params.clikit.has('Argument')) {
			// we're going to assume the name, required, and multiple are sane
		} else {
			// check if the name contains a required sequence
			let m = params.name.match(requiredRegExp);
			if (m) {
				if (params.required === undefined && m[1]) {
					params.required = true;
				}
				params.name = (m[1] || m[2]).trim() + (m[3] || '');
			}

			// check if the name contains a multiple sequence
			m = params.name.match(multipleRegExp);
			if (m) {
				if (params.multiple === undefined) {
					params.multiple = true;
				}
				params.name = m[1].trim();
			}
		}

		Object.assign(this, params);

		// TODO: params.regex
		this.hidden   = !!this.hidden;
		this.required = !!this.required;
		this.type     = checkType(this.type, 'string');
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
