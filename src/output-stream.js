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
 *
 * @extends {Transform}
 */
export default class OutputStream extends Transform {
	/**
	 * Initializes the formatter.
	 *
	 * @param {Renderer} renderer - A renderer instance.
	 * @access public
	 */
	constructor(renderer) {
		super();
		this.renderer = renderer;
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
					this.emit('banner', banner => this.push(this.renderer.render(banner)));
				}
			}
			chunk = this.renderer.render(chunk.toString());
		}

		this.push(chunk);

		cb();
	}
}
