import E from './errors';

import { checkType, transformValue } from './types';
import { declareCLIKitClass } from './util';

const formatRegExp = /^(?:-([^\W]+)(?:[ ,|]+)?)?(?:--([^\s]+))?(?:\s+?(.+))?$/;
const valueRegExp = /^(\[(?=.+\]$)|<(?=.+>$))(.+)[\]>]$/;
const negateRegExp = /^no-(.+)$/;
const aliasRegExp = /^(?:-(!)?(.)|--(!)?(.+))$/;
const numberRegExp = /^\d+(\.\d*)?$/;

/**
 * Defines an option and it's parameters.
 */
export default class Option {
	/**
	 * Creates an option descriptor.
	 *
	 * @param {String|Object} format - The option format containing the general info or an `Option`
	 * object to clone.
	 * @param {Object} [params] - Additional parameters.
	 * @param {Array.<String>|String} [params.aliases] - An array of aliases. If an alias starts
	 * with a `!`, then it is hidden from the help.
	 * @param {Function} [params.callback] - A function to call when the option has been parsed.
	 * @param {Boolean} [params.camelCase=true] - If option has a name or can derive a name from the
	 * long option format, then it the name be camel cased.
	 * @param {*} [params.default] - A default value. Defaults to `undefined` unless the `type` is
	 * set to `bool` and `negate` is `true`, then the default value will be set to `true`.
	 * @param {String} [params.desc] - The description of the option used in the help display.
	 * @param {String} [params.env] - The environment variable name to get a value from. If the
	 * environment variable is set, it overrides the value parsed from the arguments.
	 * @param {String} [params.errorMsg] - A generic message when the value is invalid.
	 * @param {Boolean} [params.hidden=false] - When `true`, the option is not displayed on the help
	 * screen or auto-suggest.
	 * @param {String} [params.hint] - The hint label if the option expects a value.
	 * @param {Number} [params.min] - When `type` is `int`, `number`, or `positiveInt`, then checks
	 * that the option's value is at greater than or equal to the specified value.
	 * @param {Boolean} [params.multiple] - When `true`, if this option is parsed more than once,
	 * the values are put in an array. When `false`, the last parsed value overwrites the previously
	 * parsed value.
	 * @param {Boolean} [params.negate] - When `true`, it will automatically prepend `no-` to the
	 * option name on the help screen and convert the value from truthy to `false` or falsey to
	 * `true`.
	 * @param {Number} [params.order=Infinity] - A number used to sort the options within the group
	 * on the help screen. Options with a lower order are sorted before those with a higher order.
	 * If two options have the same order, then they are sorted alphabetically based on the name.
	 * @param {Boolean} [params.required] - Marks the option value as required.
	 * @param {String|RegExp} [params.type] - The option type to coerce the data type into. If type
	 * is a regular expression, then it'll use it to validate the option.
	 * @param {Function} [params.validate] - A function to call to validate the option value.
	 * @access public
	 */
	constructor(format, params) {
		if (format && typeof format === 'object' && format.clikit instanceof Set && format.clikit.has('Option')) {
			params = format;
			format = format.format;
		}

		if (!format || typeof format !== 'string') {
			throw E.INVALID_ARGUMENT('Expected option format to be a non-empty string', { name: 'format', scope: 'Option.constructor', value: format });
		}
		format = format.trim();

		params || (params = {});
		if (typeof params !== 'object' || Array.isArray(params)) {
			throw E.INVALID_ARGUMENT('Expected params to be an object', { name: 'params', scope: 'Option.constructor', value: params });
		}

		params.format   = format;
		params.hidden   = !!params.hidden;
		params.long     = null;
		params.max      = params.max || null;
		params.min      = params.min || null;
		params.multiple = !!params.multiple;
		params.negate   = false;
		params.order    = params.order || Infinity;
		params.regex    = params.type instanceof RegExp ? params.type : null;
		params.required = !!params.required;

		// first try to see if we have a valid option format
		const m = format.match(formatRegExp);
		if (!m || (!m[1] && !m[2])) {
			throw E.INVALID_OPTION_FORMAT(`Invalid option format "${format}"`, { name: 'format', scope: 'Option.constructor', value: format });
		}

		params.aliases  = processAliases(params.aliases);
		params.short    = m[1] || null;

		// check if we have a long option and name
		if (m[2]) {
			const negate  = m[2].match(negateRegExp);
			params.negate = !!negate;
			params.long   = params.name = negate ? negate[1] : m[2];
		}

		params.name = params.name || params.long || params.short || params.format;
		if (!params.name) {
			throw E.INVALID_OPTION('Option has no name', { name: 'params.name', scope: 'Option.constructor', value: params.name });
		}

		let hint = params.type !== 'count' && params.hint || m[3];
		if (hint) {
			const value = hint.match(valueRegExp);
			if (value) {
				params.required = value[1] === '<';
				params.hint = hint = value[2].trim();
			} else {
				params.hint = hint;
			}
		}
		params.camelCase = params.name ? params.camelCase !== false : false;
		params.isFlag    = !hint;

		// determine the datatype
		if (params.isFlag) {
			params.datatype = checkType(params.type, 'bool');
			if (params.datatype !== 'bool' && params.datatype !== 'count') {
				throw E.CONFLICT(`Option "${params.format}" is a flag and must be type bool`, { name: 'flag', scope: 'Option.constructor', value: params.dataType });
			}
		} else {
			params.datatype = checkType(params.type, params.hint, 'string');
		}

		if (params.datatype !== 'bool' && params.negate) {
			throw E.CONFLICT(`Option "${params.format}" is negated and must be type bool`, { name: 'negate', scope: 'Option.constructor', value: params.negate });
		}

		params.default = params.default !== undefined ? params.default : (params.datatype === 'bool' && params.negate ? true : undefined);

		Object.assign(this, params);
		declareCLIKitClass(this, 'Option');
	}

	/**
	 * Transforms the given option value based on its type.
	 *
	 * @param {*} value - The value to transform.
	 * @param {Boolean} [negated] - Set to `true` if the parsed argument started with `no-`.
	 * @returns {*}
	 * @access public
	 */
	transform(value, negated) {
		value = transformValue(value, this.datatype);

		switch (this.datatype) {
			case 'bool':
				// for bools, we need to negate, but only if the option name specified negated version
				if (negated) {
					value = !value;
				}
				break;

			case 'count':
				break;

			case 'int':
			case 'number':
			case 'positiveInt':
				if (this.min !== null && value < this.min) {
					throw E.RANGE_ERROR(`Value must be greater than or equal to ${this.min}`, { max: this.max, min: this.min, name: 'min', scope: 'Option.transform', value });
				}
				if (this.max !== null && value > this.max) {
					throw E.RANGE_ERROR(`Value must be less than or equal to ${this.max}`, { max: this.max, min: this.min, name: 'max', scope: 'Option.transform', value });
				}
				break;

			case 'regex':
				if (!this.regex.test(value)) {
					throw E.INVALID_VALUE(this.errorMsg || 'Invalid value', { name: 'regex', regex: this.regex, scope: 'Option.transform', value });
				}
				break;

			default:
				// check if value could be a number
				if (numberRegExp.test(value)) {
					const n = parseFloat(value);
					if (!isNaN(n)) {
						return n;
					}
				}
		}

		return value;
	}
}

/**
 * Processes aliases into sorted buckets for faster lookup.
 *
 * @param {Array.<String>|String} aliases - An array, object, or string containing aliases.
 * @returns {Object}
 */
function processAliases(aliases) {
	const result = {
		long: {},
		short: {}
	};

	if (!aliases) {
		return result;
	}

	if (!Array.isArray(aliases)) {
		if (typeof aliases === 'object') {
			if (aliases.long && typeof aliases.long === 'object') {
				Object.assign(result.long, aliases.long);
			}
			if (aliases.short && typeof aliases.short === 'object') {
				Object.assign(result.short, aliases.short);
			}
			return result;
		}

		aliases = [ aliases ];
	}

	for (const alias of aliases) {
		if (!alias || typeof alias !== 'string') {
			throw E.INVALID_OPTION_ALIAS('Expected aliases to be an array of strings',
				{ name: 'aliases', scope: 'Option.constructor', value: alias });
		}

		for (const a of alias.split(/[ ,|]+/)) {
			const m = a.match(aliasRegExp);
			if (!m) {
				throw E.INVALID_ALIAS(`Invalid alias format "${alias}"`, { name: 'aliases', scope: 'Option.constructor', value: alias });
			}

			if (m[2]) {
				result.short[m[2]] = m[1] ? 'hidden' : 'visible';
			} else if (m[4]) {
				result.long[m[4]] = m[3] ? 'hidden' : 'visible';
			}
		}
	}

	return result;
}
