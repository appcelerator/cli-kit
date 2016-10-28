import 'babel-polyfill';
import 'source-map-support/register';

/**
 * An example of a function.
 */
export function sum(x, y) {
	return x + y;
}

/**
 * An example of a class.
 */
export class Example {
	/**
	 * Creates the bar instance.
	 *
	 * @param {Object} opts - Various settings.
	 */
	constructor(opts) {
		//
	}

	/**
	 * Example method.
	 *
	 * @param {String} name - The name to uppercase.
	 * @returns {String}
	 * @access public
	 */
	toUpper(name) {
		return name.toUpperCase();
	}
}
