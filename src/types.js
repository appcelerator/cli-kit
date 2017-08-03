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

export class Type {
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

export function addType(opts) {
	if (!(opts instanceof Type)) {
		opts = new Type(opts);
	}
	types[opts.name] = opts;
}

addType({
	name: 'bool',
	transform: value => {
		return value && value !== 'false';
	}
});

addType({
	name: 'date',
	transform: value => {
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

addType({
	name: 'file',
	transform: value => {
		if (!value) {
			throw new Error('Invalid file');
		}
		return value;
	}
});

addType({
	name: 'int',
	transform: value => {
		let num;
		if (!intRegExp.test(value) || isNaN(num = Number(value))) {
			throw new Error('Value is not an integer');
		}
		return num;
	}
});

addType({
	name: 'json',
	transform: value => {
		try {
			return JSON.parse(value);
		} catch (e) {
			throw new Error(`Invalid json: ${e.message}`);
		}
	}
});

addType({
	name: 'number',
	transform: value => {
		let num = Number(value);
		if (isNaN(num)) {
			throw new Error('Value is not an integer');
		}
		return num;
	}
});

addType({
	name: 'positiveInt',
	transform: value => {
		let num;
		if (!intRegExp.test(value) || isNaN(num = Number(value)) || num < 0) {
			throw new Error('Value is not a positive integer');
		}
		return num;
	}
});

addType({
	name: 'string',
	transform: value => value
});

addType({
	name: 'yesno',
	transform: value => {
		if (yesRegExp.test(value)) {
			return true;
		}
		if (noRegExp.test(value)) {
			return false;
		}
		throw new Error('Value must be "yes" or "no"');
	}
});
