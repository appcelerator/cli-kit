import E from '../lib/errors';

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
const ignoredEncodings = /^base64|binary|buffer|hex$/;

/**
 * Processes output chunks through a formatter.
 *
 * @extends {Transform}
 */
export default class OutputStream extends Transform {
	/**
	 * Initializes the stream.
	 *
	 * @param {Object} [opts] - Various options.
	 * @param {Boolean} [opts.decodeStrings=false] - By default, Node will decode strings into a
	 * buffer, losing the encdoing and disabling the markdown parser.
	 * @param {Boolean} [opts.markdown] - When `true`, parses the chunks on the fly as markdown and
	 * renders the result. By default, markdown is not enabled and chunks are simply passed through.
	 * @param {Number} [opts.width] - The maximum width of the rendered output. Longer text is
	 * wrapped to the next line. By default, output is not wrapped and lets the terminal wrap the
	 * long lines.
	 * @access public
	 */
	constructor(opts = {}) {
		if (!opts || typeof opts !== 'object') {
			throw E.INVALID_ARGUMENT('Expected options to be an object', { name: 'opts', scope: 'OutputStream.constructor', value: opts });
		}

		// we need to force strings to not be decoding unless they have been explicitly enabled in
		// which case we simply pass through all chunks
		opts.decodeStrings = opts.decodeString === true;

		super(opts);

		this.markdown = !!opts.markdown;

		if (opts.width !== undefined) {
			if (typeof opts.width !== 'number') {
				throw E.INVALID_ARGUMENT('Expected width to be a number', { name: 'width', scope: 'OutputStream.constructor', value: opts.width });
			}
			if (opts.width < 1) {
				throw E.RANGE_ERROR('Width must be a positive number', { name: 'width', scope: 'OutputStream.constructor', value: opts.width });
			}
			this.width = opts.width;
		}
	}

	/**
	 * Passes all text chunks to a formatter for rendering. First text chunk that is not detected as
	 * a JSON object/array or XML document will emit a `start` event.
	 *
	 * @param {*} chunk - Data being written to the stream.
	 * @param {String} encoding - The message encoding. This method does not attempt to format
	 * base64, binary, or hex encoded chunks.
	 * @param {Function} cb - A function to call when done.
	 * @access private
	 * @emits OutputStream#start
	 */
	_transform(chunk, encoding, cb) {
		if (!ignoredEncodings.test(encoding)) {
			if (this.isData === undefined) {
				this.isData = dataRegExp.test(chunk);
				if (!this.isData) {
					this.emit('start', str => {
						this.push(str);
						// this.push(this.renderer.render(str))
					});
				}
			}

			if (!this.isData && this.renderer) {
				chunk = this.renderer.render(chunk.toString());
			}
		}

		this.push(chunk);
		cb();
	}
}
