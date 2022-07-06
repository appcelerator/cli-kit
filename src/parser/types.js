import E from '../lib/errors.js';

const dateRegExp = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d+)?Z?)?$/i;
const hexRegExp = /^0x[A-Fa-f0-9]+$/;
const intRegExp = /^-?\d+$/;
const noRegExp = /^no?$/i;
const yesRegExp = /^y(es)?$/i;

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
 * @param {String|RegExp} type - A list of types to validate.
 * @param {Array.<String>} [otherTypes] - An optional list of types to default to if no
 * types were originally specified.
 * @returns {String}
 */
export function checkType(type, ...otherTypes) {
	if (!type) {
		for (const other of otherTypes) {
			if (typeof other !== 'undefined' && other !== null && types[other]) {
				return other;
			}
		}
	} else if (type instanceof RegExp) {
		return 'regex';
	} else if (!types[type]) {
		throw E.INVALID_DATA_TYPE(`Unsupported type "${type}"`, { name: 'type', scope: 'types.checkType', types: Object.keys(types), value: type });
	}

	return type;
}

/**
 * Transforms a value to the first successfully transformed data type.
 *
 * @param {*} value - The value to transform.
 * @param {String} [type] - A specific data type to try to coerce the value into.
 * @returns {*}
 */
export function transformValue(value, type) {
	if (!type && typeof value === 'string') {
		const lvalue = value.toLowerCase();

		// try as a boolean
		if (lvalue === 'true') {
			return true;
		}
		if (lvalue === 'false') {
			return false;
		}

		// try as a number
		const num = Number(value);
		if (!isNaN(num)) {
			return num;
		}

		// try as a date
		if (dateRegExp.test(value)) {
			return new Date(value);
		}

		// try as json
		try {
			return JSON.parse(value);
		} catch (e) {
			// nope
		}
	} else if (types[type] && typeof types[type].transform === 'function') {
		value = types[type].transform(value);
	}

	// return the original value
	return value;
}

/**
 * Defines a option/argument data type and its transform function.
 */
export class Type {
	/**
	 * Creates the data type instance.
	 *
	 * @param {Object} params - Various options.
	 * @param {String} params.name - The name of the data type.
	 * @param {Function} [params.transform] - A function that transforms the parsed option/argument
	 * string value to the correct data type. By default, no transform is applied and values will
	 * remain as strings.
	 * @access public
	 */
	constructor(params) {
		if (!params || typeof params !== 'object' || Array.isArray(params)) {
			throw E.TYPE_ERROR('Expected params to be an object', { name: 'params', scope: 'Type.constructor', value: params });
		}

		if (!params.name || typeof params.name !== 'string') {
			throw E.TYPE_ERROR('Missing type name', { name: 'name', scope: 'Type.constructor', value: params.name });
		}

		if (params.transform && typeof params.transform !== 'function') {
			throw E.TYPE_ERROR('Expected transform to be a function', { name: 'transform', scope: 'Type.constructor', value: params.transform });
		}

		this.name = params.name;
		this.transform = params.transform;
	}
}

/**
 * Registers a type.
 *
 * @param {Type|Object} params - A `Type` instance or params for constructing a new `Type` instance.
 */
export function registerType(params) {
	if (!(params instanceof Type)) {
		params = new Type(params);
	}
	types[params.name] = params;
}

registerType({
	name: 'bool',
	transform(value) {
		return value && value !== 'false';
	}
});

registerType({
	name: 'count'
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
			throw E.INVALID_DATE('Invalid date', { name: 'date', scope: 'types.date.transform', value: date });
		}

		return date;
	}
});

registerType({
	name: 'file',
	transform(value) {
		if (!value) {
			throw E.EMPTY_STRING('Invalid file', { name: 'file', scope: 'types.file.transform', value });
		}
		return value;
	}
});

registerType({
	name: 'int',
	transform(value) {
		let num;
		if ((!hexRegExp.test(value) && !intRegExp.test(value)) || isNaN(num = Number(value))) {
			throw E.INVALID_NUMBER('Value is not an integer', { name: 'int', scope: 'types.int.transform', value });
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
			throw E.INVALID_JSON(`Invalid json: ${e.message}`, { name: 'json', scope: 'types.json.transform', value });
		}
	}
});

registerType({
	name: 'number',
	transform(value) {
		let num = Number(value);
		if (isNaN(num)) {
			throw E.INVALID_NUMBER('Value is not an number', { name: 'number', scope: 'types.number.transform', value });
		}
		return num;
	}
});

registerType({
	name: 'positiveInt',
	transform(value) {
		let num;
		if ((!hexRegExp.test(value) && !intRegExp.test(value)) || isNaN(num = Number(value)) || num < 0) {
			throw E.INVALID_NUMBER('Value is not a positive integer', { name: 'positiveInt', scope: 'types.positiveInt.transform', value });
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
		throw E.NOT_YES_NO('Value must be "yes" or "no"', 'ERR_INVALID_YES_NO', { name: 'yesno', scope: 'types.yesno.transform', value });
	}
});
