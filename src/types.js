const dateRegExp = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d+)?Z?)?$/i;
const intRegExp = /^[0-9-]+$/;
const yesRegExp = /^y(es)?$/;
const noRegExp = /^no?$/;

/**
 * Options/args have a type. Generally they are either a `bool` (flag) or
 * `string` (option/arg). However, for non-bool options, you can specify a type
 * that will validate and format the value.
 *
 * Below is the list of supported types and their transformers.
 */
export const types = {};

/**
 * Ensures that the specified list of types is indeed an array and each value is a supported type,
 * then returns the cleaned up list of types or a default value if no types were found.
 *
 * @param {String} type - A list of types to validate.
 * @param {String} [defaultValue] - An optional list of types to default to if no
 * types were originally specified.
 * @returns {String}
 */
export function checkType(type, defaultValue) {
	if (type && !types[type]) {
		throw new Error(`Unsupported type "${type}"`);
	}

	if (!type && defaultValue) {
		return defaultValue;
	}

	return type;
}

/**
 * Transforms a value to the first successfully transformed data type.
 *
 * @param {*} value - The value to transform.
 * @param {String} type - A list of data types to try to coerce the value into.
 * @returns {*}
 */
export function transformValue(value, type) {
	if (types[type] && typeof types[type].transform === 'function') {
		value = types[type].transform(value);
	}
	return value;
}

/**
 * Defines a option/argument data type and its transform function.
 */
export class Type {
	/**
	 * Creates the data type instance.
	 *
	 * @param {Object} opts - Various options.
	 * @param {String} opts.name - The name of the data type.
	 * @param {Function} [opts.transform] - A function that transforms the parsed option/argument
	 * string value to the correct data type. By default, no transform is applied and values will
	 * remain as strings.
	 * @access public
	 */
	constructor(opts) {
		if (!opts || typeof opts !== 'object' || Array.isArray(opts)) {
			throw new TypeError('Expected opts to be an object');
		}

		if (!opts.name) {
			throw new Error('Missing type name');
		}

		if (opts.transform && typeof opts.transform !== 'function') {
			throw new TypeError('Expected transform to be a function');
		}

		this.name = opts.name;
		this.transform = opts.transform;
	}
}

/**
 * Registers a type.
 *
 * @param {Type|Object} opts - A `Type` instance or params for constructing a new `Type` instance.
 */
export function registerType(opts) {
	if (!(opts instanceof Type)) {
		opts = new Type(opts);
	}
	types[opts.name] = opts;
}

registerType({
	name: 'bool',
	transform(value) {
		return value && value !== 'false';
	}
});

registerType({
	name: 'date',
	transform(value) {
		let date;

		if (intRegExp.test(value)) {
			const num = Number(value);
			if (!isNaN(num) && num > 0) {
				date = new Date(num * 1000);
			}
		} else if (dateRegExp.test(value)) {
			date = new Date(value);
		}

		if (!date || date.toString() === 'Invalid date') {
			throw new Error('Invalid date');
		}

		return date;
	}
});

registerType({
	name: 'file',
	transform(value) {
		if (!value) {
			throw new Error('Invalid file');
		}
		return value;
	}
});

registerType({
	name: 'int',
	transform(value) {
		let num;
		if (!intRegExp.test(value) || isNaN(num = Number(value))) {
			throw new Error('Value is not an integer');
		}
		return num;
	}
});

registerType({
	name: 'json',
	transform(value) {
		try {
			return JSON.parse(value);
		} catch (e) {
			throw new Error(`Invalid json: ${e.message}`);
		}
	}
});

registerType({
	name: 'number',
	transform(value) {
		let num = Number(value);
		if (isNaN(num)) {
			throw new Error('Value is not an integer');
		}
		return num;
	}
});

registerType({
	name: 'positiveInt',
	transform(value) {
		let num;
		if (!intRegExp.test(value) || isNaN(num = Number(value)) || num < 0) {
			throw new Error('Value is not a positive integer');
		}
		return num;
	}
});

registerType({
	name: 'string'
});

registerType({
	name: 'yesno',
	transform(value) {
		if (yesRegExp.test(value)) {
			return true;
		}
		if (noRegExp.test(value)) {
			return false;
		}
		throw new Error('Value must be "yes" or "no"');
	}
});
