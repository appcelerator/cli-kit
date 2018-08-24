import E from '../lib/errors';
import Markdown from './markdown';

import { Transform } from 'stream';

/**
 * Cheap check to see if output may be XML or JSON object output.
 * @type {RegExp}
 */
const dataRegExp = /^\s*[<{[]/;

/**
 * The list of encodings where chunks will be parsed as markdown when enabled.
 * @type {RegExp}
 */
const encodings = new Set([ 'ascii', 'latin1', 'ucs2', 'utf8', 'utf16le' ]);

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
	 * @param {Boolean|Object} [opts.markdown] - When `true`, parses the chunks on the fly as markdown and
	 * renders the result. By default, markdown is not enabled and chunks are simply passed through.
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

		if (opts.markdown) {
			this.markdown = new Markdown(typeof opts.markdown === 'object' ? opts.markdown : {});
			this._flush = this.markdown.flush.bind(this.markdown);
		}
	}

	/**
	 * Passes all text chunks to a formatter for rendering. First text chunk that is not detected as
	 * a JSON object/array or XML document will emit a `start` event.
	 *
	 * @param {*} chunk - Data being written to the stream.
	 * @param {String} encoding - The message encoding.
	 * @param {Function} cb - A function to call when done.
	 * @access private
	 * @emits OutputStream#start
	 */
	_transform(chunk, encoding, cb) {
		if (typeof encoding === 'function') {
			cb = encoding;
			encoding = null;
		}

		if (!encoding || encodings.has(encoding)) {
			if (this._isData === undefined) {
				this._isData = dataRegExp.test(chunk);
				if (!this._isData) {
					this.emit('start', (str, enc = encoding) => {
						if (this.markdown) {
							str = this.markdown.process(str, enc);
						}
						if (str) {
							this.push(str, enc);
						}
					});
				}
			}

			if (!this._isData && this.markdown) {
				const str = this.markdown.process(chunk.toString(), encoding);
				if (str) {
					this.push(str, encoding);
				}
				return cb();
			}
		}

		this.push(chunk, encoding);
		cb();
	}
}
