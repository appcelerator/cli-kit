import E from './errors';

import { Transform } from 'stream';

/**
 * Matches output that begins with a `<` for XML output and `{` or `[` for JSON object output.
 * @type {RegExp}
 */
const dataRegExp = /^\s*[<{[]/;

/**
 * Matches non-text chunk encodings which will be ignored by the formatter.
 * @type {RegExp}
 */
const ignoredEncodings = /^base64|binary|hex$/;

/**
 * Handles the signaling for the banner to be displayed and formatting of any output that contains
 * markdown syntax.
 */
export default class Formatter extends Transform {
	/**
	 * ?
	 * @param {Object} [opts] - Various options.
	 * @param {Number} [opts.width=100] - The maximum width of the output before wrapping.
	 * @access public
	 */
	constructor(opts = {}) {
		if (typeof opts !== 'object') {
			throw E.INVALID_ARGUMENT('Expected format options to be an object', { name: 'opts', scope: 'Formatter.constructor', value: opts });
		}

		if (opts.width !== undefined && typeof opts.width !== 'number') {
			throw E.INVALID_ARGUMENT('Expected format width to be a number', { name: 'width', scope: 'Formatter.constructor', value: opts.width });
		}

		super(opts);

		this.width = opts.width || 100;
	}

	/**
	 * Fires an event to display a banner when non-xml/json output is being rendered and parses the
	 * output for markdown to be formatted.
	 *
	 * @param {*} chunk - Data being written to the stream.
	 * @param {String} encoding - The message encoding. This method does not attempt to format
	 * base64, binary, or hex encoded chunks.
	 * @param {Function} cb - A function to call when done.
	 * @access private
	 */
	_transform(chunk, encoding, cb) {
		if (!ignoredEncodings.test(encoding)) {
			if (!this.firedBanner) {
				this.firedBanner = true;
				if (!dataRegExp.test(chunk)) {
					this.emit('banner', banner => this.push(this.format(banner)));
				}
			}
			chunk = this.format(chunk.toString());
		}

		this.push(chunk);

		cb();
	}

	/**
	 * Formats as a string using markdown.
	 *
	 * @param {String} str - The string to format.
	 * @returns {String}
	 * @access private
	 */
	format(str) {
		// console.log('FORMATTING', str);
		return str;
	}
}
