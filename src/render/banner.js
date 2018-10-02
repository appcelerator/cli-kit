import E from '../lib/errors';

import { Transform } from 'stream';

/**
 * Cheap check to see if output may be XML or JSON object output.
 * @type {RegExp}
 */
const dataRegExp = /^\s*[<{[]/;

/**
 * The list of encodings to check the chunk contents for data and emit the 'start' event.
 * @type {RegExp}
 */
const encodings = new Set([ 'ascii', 'latin1', 'ucs2', 'utf8', 'utf16le' ]);

/**
 * Processes output chunks through a formatter.
 *
 * @extends {Transform}
 */
export class OutputStream extends Transform {
	/**
	 * Initializes the stream.
	 *
	 * @param {Object} [opts] - Various options.
	 * @param {Banner} [opts.banner] - A banner instance to invoke on first output.
	 * @param {Boolean} [opts.decodeStrings=false] - By default, Node will decode strings into a
	 * buffer, losing the encdoing.
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

		if (opts.banner) {
			if (!(opts.banner instanceof Banner)) {
				throw E.INVALID_ARGUMENT('Expected banner to be a Banner object', { name: 'banner', scope: 'OutputStream.constructor', value: opts.banner });
			}
			this.banner = opts.banner;
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
				if (!this._isData && this.banner) {
					let { banner, enabled } = this.banner;
					if (banner && enabled) {
						if (typeof banner === 'function') {
							banner = banner();
						}
						if (banner) {
							this.push(`${String(banner).trim()}\n\n`);
						}
						this.banner.enabled = false;
					}
				}
			}
		}

		this.push(chunk, encoding);
		cb();
	}
}

/**
 * Wires up output streams to watch for the first output and display the banner.
 */
export default class Banner {
	/**
	 * Initializes the banner output streams.
	 *
	 * @param {Object} params - Various parameters.
	 * @param {String|Function} [params.banner] - The banner or function to return the banner.
	 * @param {stream.Writable} [params.stderr] - A stream to write error output to.
	 * @param {stream.Writable} [params.stdout] - A stream to write output to.
	 * @access public
	 */
	constructor({ banner, stderr, stdout }) {
		this.banner = banner;
		this.enabled = true;

		this.stderr = new OutputStream({ banner: this });
		this.stdout = new OutputStream({ banner: this });

		this.stderr.pipe(stderr);
		this.stdout.pipe(stdout);
	}
}
