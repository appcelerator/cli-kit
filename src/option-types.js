const dateRegExp = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d+)?Z?)?$/i;
const intRegExp = /^[0-9-]+$/;
const yesRegExp = /^y(es)?$/;
const noRegExp = /^no?$/;

/**
 * Options have a type. Generally they are either a `bool` (flag) or `string`
 * (option). However, for non-bool options, you can specify a type that will
 * validate and format the value.
 *
 * Below is the list of supported types and their transformers.
 */
export const types = {};

export class OptionType {
	constructor(opts) {
		if (!opts || typeof opts !== 'object' || Array.isArray(opts)) {
			throw new TypeError('Expected opts to be an object');
		}

		if (!opts.name) {
			throw new Error('Missing option type name');
		}

		if (opts.transform && typeof opts.transform !== 'function') {
			throw new TypeError('Expected transform to be a function');
		}

		this.name = opts.name;
		this.transform = opts.transform;
	}
}

export default function addOptionType(opts) {
	if (!(opts instanceof OptionType)) {
		opts = new OptionType(opts);
	}
	types[opts.name] = opts;
}

addOptionType({
	name: 'bool',
	transform: value => Boolean(value)
});

addOptionType({
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

addOptionType({
	name: 'file',
	transform: value => {
		if (!value) {
			throw new Error('Invalid file');
		}
		return value;
	}
});

addOptionType({
	name: 'int',
	transform: value => {
		let num;
		if (!intRegExp.test(value) || isNaN(num = Number(value))) {
			throw new Error('Value is not an integer');
		}
		return num;
	}
});

addOptionType({
	name: 'json',
	transform: value => {
		try {
			return JSON.parse(value);
		} catch (e) {
			throw new Error(`Invalid json: ${e.message}`);
		}
	}
});

addOptionType({
	name: 'number',
	transform: value => {
		let num = Number(value);
		if (isNaN(num)) {
			throw new Error('Value is not an integer');
		}
		return num;
	}
});

addOptionType({
	name: 'positiveInt',
	transform: value => {
		let num;
		if (!intRegExp.test(value) || isNaN(num = Number(value)) || num < 0) {
			throw new Error('Value is not a positive integer');
		}
		return num;
	}
});

addOptionType({
	name: 'string',
	transform: value => value
});

addOptionType({
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
