import E from '../lib/errors';

import { checkType, transformValue } from './types';
import { declareCLIKitClass } from '../lib/util';

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
	 * @param {Object|String|Argument} [params] - Various parameters. If value is a `String`, then
	 * see `params.name` below for usage.
	 * @param {Function} [params.callback] - A function to call when the argument has been
	 * processed. This happens parsing is complete.
	 * @param {Boolean} [params.camelCase=true] - If option has a name or can derive a name from the
	 * long option format, then it the name be camel cased.
	 * @param {String} [params.desc] - The description of the argument used in the help output.
	 * @param {String} [params.env] - The environment variable name to get a value from. If the
	 * environment variable is set, it overrides the value parsed from the arguments.
	 * @param {Boolean} [params.hidden=false] - When `true`, the argument is not displayed on the
	 * help screen or auto-suggest.
	 * @param {String} [params.hint] - The hint label if the argument expects a value.
	 * @param {Number} [params.max] - When `type` is `int`, `number`, or `positiveInt`, the
	 * validator will assert the value is less than or equal to the specified value.
	 * @param {Number} [params.min] - When `type` is `int`, `number`, or `positiveInt`, the
	 * validator will assert the value is greater than or equal to the specified value.
	 * @param {Boolean} [params.multiple=false] - When `true`, the value becomes an array with all
	 * remaining parsed arguments. Any subsequent argument definitions after a `multiple` argument
	 * are ignored.
	 * @param {String} [params.name] - The name of the argument. If the name is wrapped in angle
	 * brackets (`<`, `>`), then the brackets are trimmed off and the argument is flagged as
	 * required (unless `params.required` is explicitly set to `false`). If the name is wrapped in
	 * square brackets (`[`, `]`), then the brackets are trimmed off. If the name ends with `...`
	 * and `params.multiple` is not specified, then it will set `params.multiple` to `true`.
	 * @param {Boolean} [params.required=false] - Marks the option value as required.
	 * @param {String} [params.type] - The argument type to coerce the data type into.
	 * @access public
	 */
	constructor(params) {
		/*
		{ name: 'path', required: true, regex: /^\//, desc: 'the path to request' },
		{ name: 'json', type: 'json', desc: 'an option JSON payload to send' }
		*/

		if (!params || (typeof params !== 'string' && typeof params !== 'object') || Array.isArray(params)) {
			throw E.INVALID_ARGUMENT('Expected argument params to be a non-empty string or an object', { name: 'params', scope: 'Argument.constructor', value: params });
		}

		if (typeof params === 'string') {
			params = {
				name: params
			};
		}

		let { name } = params;
		if (typeof name !== 'string' || !(name = name.trim())) {
			throw E.INVALID_ARGUMENT('Expected argument name to be a non-empty string', { name: 'name', scope: 'Argument.constructor', value: name });
		}

		let { multiple, required } = params;

		// check if the name contains a required sequence
		let m = name.match(requiredRegExp);
		if (m) {
			if (required === undefined && m[1]) {
				required = true;
			}
			name = (m[1] || m[2]).trim() + (m[3] || '');
		}

		// check if the name contains a multiple sequence
		m = name.match(multipleRegExp);
		if (m) {
			if (multiple === undefined) {
				multiple = true;
			}
			name = m[1].trim();
		}

		this.callback  = params.callback;
		this.camelCase = name ? params.camelCase !== false : false;
		this.datatype  = checkType(params.type, 'string');
		this.desc      = params.desc;
		this.hidden    = !!params.hidden;
		this.hint      = params.hint || name;
		this.name      = name;
		this.max       = typeof params.max === 'number' ? params.max : null;
		this.min       = typeof params.min === 'number' ? params.max : null;
		this.multiple  = !!multiple;
		this.required  = !!required;
		this.regex     = params.type instanceof RegExp ? params.type : null;

		declareCLIKitClass(this, 'Argument');

		// mix in any other custom props
		for (const [ key, value ] of Object.entries(params)) {
			if (!Object.prototype.hasOwnProperty.call(this, key)) {
				this[key] = value;
			}
		}
	}

	/**
	 * Returns this argument's schema.
	 *
	 * @type {Object}
	 */
	get schema() {
		return {
			desc:     this.desc,
			multiple: this.multiple,
			name:     this.name,
			required: this.required,
			type:     this.type
		};
	}

	/**
	 * Transforms the given argument value based on its type.
	 *
	 * @param {*} value - The value to transform.
	 * @returns {*}
	 * @access public
	 */
	transform(value) {
		value = transformValue(value, this.datatype);

		switch (this.datatype) {
			case 'positiveInt':
			case 'int':
			case 'number':
				if (this.min !== null && value < this.min) {
					throw E.RANGE_ERROR(`Value must be greater than or equal to ${this.min}`, { max: this.max, min: this.min, name: `transform.${this.type}`, scope: 'Argument.transform', value });
				}
				if (this.max !== null && value > this.max) {
					throw E.RANGE_ERROR(`Value must be less than or equal to ${this.max}`, { max: this.max, min: this.min, name: `transform.${this.type}`, scope: 'Argument.transform', value });
				}
				break;

			case 'regex':
				if (!this.regex.test(value)) {
					throw E.INVALID_VALUE(this.errorMsg || 'Invalid value', { name: 'regex', regex: this.regex, scope: 'Option.transform', value });
				}
				break;
		}

		return value;
	}
}
