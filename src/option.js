import { checkType, transformValue } from './types';

const formatRegExp = /^(?:-([^-])(?:[ ,|]+)?)?(?:--([^\s]+))?(?:\s+?(.+))?$/;
const valueRegExp = /^(\[(?=.+\]$)|<(?=.+>$))(.+)[\]>]$/;
const negateRegExp = /^no-(.+)$/;
const aliasSepRegExp = /[ ,|]+/;
const aliasRegExp = /^(?:-(.)|-{2}(.+))$/;

/**
 * Defines an option and it's parameters.
 */
export default class Option {
	/**
	 * Creates an option descriptor.
	 *
	 * @param {String} format - The option format containing the general info.
	 * @param {Object} [params] - Additional parameters.
	 * @param {Object|Array<String>} [params.aliases] - An array of option aliases or an object with
	 * `visible` and `hidden` arrays of aliases.
	 * @param {*} [params.default] - ???????
	 * @param {String} [params.desc] - The description of the option used in the help display.
	 * @param {String} [param.env] - The environment variable name to get a value from. If the
	 * environment variable is set, it overrides the value parsed from the arguments.
	 * @param {Boolean} [params.hidden=false] - When `true`, the option is not displayed on the help
	 * screen or auto-suggest.
	 * @param {String} [params.hint] - The hint label if the option expects a value.
	 * @param {Number} [params.min] - When `type` is `int`, `number`, or `positiveInt`, then checks
	 * that the option's value is at greater than or equal to the specified value.
	 * @param {Boolean} [params.multiple] - ????????????????????????????????????????????????????
	 * @param {String} [params.name] - The name of the option.
	 * @param {Boolean} [params.negate] - When `true`, ??????????
	 * @param {Boolean} [params.required] - Marks the option value as required.
	 * @param {String|Array.<String>} [params.type] - The option type to coerce the data type into.
	 * @param {Function} [params.validate] - A function to call to validate the option value.
	 * @access public
	 */
	constructor(format, params) {
		if (typeof format !== 'string') {
			throw new TypeError('Expected format to be a string');
		}
		format = format.trim();

		if (!params) {
			params = {};
		}
		if (typeof params !== 'object' || Array.isArray(params)) {
			throw new TypeError('Expected params to be an object');
		}

		// first try to see if we have a valid option format
		const m = format.match(formatRegExp);
		if (!m || (!m[1] && !m[2])) {
			throw new TypeError(`Invalid option format "${format}"`);
		}
		const hint = m[3];

		// process the aliases
		const aliases = {
			long: {},
			short: {}
		};

		if (params.aliases) {
			const initAliases = (items, visibility = 'hidden') => {
				if (Array.isArray(items)) {
					for (const alias of items) {
						if (!alias || typeof alias !== 'string') {
							throw new TypeError('Expected aliases to be an array of strings or an object with visible/hidden array of strings');
						}

						for (const a of alias.split(aliasSepRegExp)) {
							const m = a.match(aliasRegExp);
							if (!m) {
								throw new TypeError(`Invalid alias format "${alias}"`);
							}

							if (m[1]) {
								aliases.short[m[1]] = visibility;
							} else if (m[2]) {
								aliases.long[m[2]] = visibility;
							}
						}
					}
				}
			};

			if (Array.isArray(params.aliases)) {
				initAliases(params.aliases);
			} else if (typeof params.aliases === 'object') {
				initAliases(params.aliases.visible, 'visible');
				initAliases(params.aliases.hidden);
			} else {
				throw new TypeError('Expected aliases to be an array of strings or an object with visible/hidden array of strings');
			}
		}

		Object.assign(this, params);

		// initialize the param values
		this.aliases  = aliases;
		this.long     = null;
		this.negate   = false;
		this.short    = m[1] || null;

		// check if we have a long option and name
		if (m[2]) {
			const negate = m[2].match(negateRegExp);
			this.negate = !!negate;
			this.name = negate ? negate[1] : m[2];
			this.long = this.name;
		}

		// check if we have a hint
		if (hint) {
			const value = hint.match(valueRegExp);
			if (!value) {
				throw new TypeError(`Invalid option format "${format}"`);
			}
			this.required = value[1] === '<';
			this.hint = value[2].trim();
		}

		// TODO: params.regex

		this.camelCase = params.camelCase !== false;
		this.count     = !!params.count;
		this.hint      = params.hint || this.hint;
		this.max       = params.max || null;
		this.min       = params.min || null;
		this.multiple  = !!params.multiple;
		this.name      = params.name || this.name || (this.long ? `--${this.long}` : this.short ? `-${this.short}` : null);
		this.order     = params.order || null;
		this.required  = this.required === undefined ? !!params.required : this.required;
		this.type      = checkType(params.type, hint || 'bool');

		if (this.type !== 'bool') {
			if (this.negate) {
				throw new Error('Negate requires option to be a bool');
			}

			if (this.count) {
				throw new Error('Count requires option to be a bool');
			}
		}

		this.default   = params.default || (this.type === 'bool' && this.negate ? true : undefined);
	}

	/**
	 * Transforms the given option value based on its type.
	 *
	 * @param {*} value - The value to transform.
	 * @param {Boolean} [negated] - Set to `true` if the parsed argument started with `no-`.
	 * @returns {*}
	 */
	transform(value, negated) {
		value = transformValue(value, this.type);

		switch (this.type) {
			case 'bool':
				// for bools, we need to negate, but only if the option name specified negated version
				if (negated) {
					value = !value;
				}
				break;

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
