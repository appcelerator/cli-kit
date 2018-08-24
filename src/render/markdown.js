import E from '../lib/errors';
import kramed from 'kramed';
import TerminalRenderer from 'marked-terminal';
// import rules from './rules';

// const emptyLine = /^ +$/gm;
const lastNewLine = /\n\n+.*$/;
// const lineEndings = /\r\n|\r/g;
// const tab = /\t/g;
// const unicodeNewLine = /\u2424/g;
// const unicodeNoBreakSpace = /\u00a0/g;

export default class Markdown {
	/**
	 * Buffer for incomplete Markdown text.
	 * @type {String}
	 */
	buffer = '';

	/**
	 * Initializes the stream.
	 *
	 * @param {Object} [opts] - Various options.
	 * @param {Object} [opts.rules] - An object of rule names to rules.
	 * @param {Number} [opts.width] - The maximum width of the rendered output. Longer text is
	 * wrapped to the next line. By default, output is not wrapped and lets the terminal wrap the
	 * long lines.
	 * @access public
	 */
	constructor(opts = {}) {
		if (opts.width !== undefined) {
			if (typeof opts.width !== 'number') {
				throw E.INVALID_ARGUMENT('Expected width to be a number', { name: 'width', scope: 'Markdown.constructor', value: opts.width });
			}
			if (opts.width < 1) {
				throw E.RANGE_ERROR('Width must be a positive number', { name: 'width', scope: 'Markdown.constructor', value: opts.width });
			}
		}

		// this.rules = Object.assign({}, rules, opts.rules);

		this.renderer = new TerminalRenderer(opts);
	}

	/**
	 * Forces the remainder of the buffer to be parsed.
	 *
	 * @param {Function} cb - A callback to call with any final output.
	 * @access public
	 */
	flush(cb) {
		cb(null, this.parse(this.buffer));
	}

	/**
	 * Parses a chunk of text into markdown.
	 *
	 * @param {String} chunk - A chunk of text to parse.
	 * @returns {String|undefined}
	 * @access private
	 */
	parse(chunk) {
		const opts = Object.assign({}, kramed.defaults, {
			renderer: this.renderer
		});
		const tokens = kramed.lexer(chunk, opts);
		return kramed.parser(tokens, opts);
	}

	/**
	 * Buffers a chunk and initiates a parse.
	 *
	 * @param {*} chunk - Data being written to the stream.
	 * @param {String} encoding - The message encoding.
	 * @access private
	 */
	process(chunk, encoding) {
		// add the text to the buffer
		this.buffer += chunk;
		// .replace(lineEndings,         '\n')
		// .replace(tab,                 '    ')
		// .replace(unicodeNoBreakSpace, ' ')
		// .replace(unicodeNewLine,      '\n')
		// .replace(emptyLine,           '');

		const m = this.buffer.match(lastNewLine);
		if (m && m.index) {
			const result = this.parse(this.buffer.substring(0, m.index));
			if (result) {
				this.buffer = this.buffer.substring(m.index);
				return result;
			}
		}
	}
}
