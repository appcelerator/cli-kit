import debug from './lib/debug';
import E from './lib/errors';
import readline from 'readline';

import * as ansi from './lib/ansi';

import { Console } from 'console';
import { declareCLIKitClass } from './lib/util';
import { EventEmitter } from 'events';

const { log } = debug('cli-kit:terminal');
const { highlight }  = debug.styles;

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
 * Since `stdout` is global, each Terminal instance will listen to it and this causes a warning, so
 * by setting the max listeners, we can suppress the message.
 */
process.stdout.setMaxListeners(Infinity);

/**
 * A high-level interface around all terminal oprations.
 *
 * @emits Terminal#keypress
 * @emits Terminal#resize
 */
export default class Terminal extends EventEmitter {
	/**
	 * Initializes the terminal, streams, and a console instance.
	 *
	 * @param {Object} [opts] - Various options.
	 * @param {Number} [opts.defaultColumns=80] - The default number of columns wide the terminal
	 * should be when `stdout` is not a TTY.
	 * @param {Number} [opts.defaultRows=24] - The default number of rows high the terminal should
	 * be when `stdout` is not a TTY.
	 * @param {stream.Writable} [opts.stderr=process.stderr] - A writable output stream.
	 * @param {stream.Readable} [opts.stdin=process.stdin] - A stream for which to read input.
	 * @param {stream.Writable} [opts.stdout=process.stdout] - A writable output stream.
	 * @param {Number} [opts.promptTimeout] - The number of milliseconds of inactivity before
	 * timing out.
	 * @access public
	 */
	constructor(opts = {}) {
		super();
		declareCLIKitClass(this, 'Terminal');

		if (opts.defaultColumns !== undefined && (typeof opts.defaultColumns !== 'number' || isNaN(opts.defaultColumns) || opts.defaultColumns < 1)) {
			throw E.INVALID_ARGUMENT('Expected default columns to be a positive integer');
		}
		this.defaultColumns = opts.defaultColumns || 80;

		if (opts.defaultRows !== undefined && (typeof opts.defaultRows !== 'number' || isNaN(opts.defaultRows) || opts.defaultRows < 1)) {
			throw E.INVALID_ARGUMENT('Expected default rows to be a positive integer');
		}
		this.defaultRows = opts.defaultRows || 24;

		this.stdin = opts.stdin || process.stdin;
		if (!this.stdin || typeof this.stdin !== 'object' || typeof this.stdin.read !== 'function') {
			throw E.INVALID_ARGUMENT('Expected the stdin stream to be a readable stream', { name: 'stdin', scope: 'Terminal.constructor', value: opts.stdin });
		}
		readline.emitKeypressEvents(this.stdin);

		this.stdout = this.patchStreamWrite('stdout', opts.stdout || process.stdout);
		this.stderr = this.patchStreamWrite('stderr', opts.stderr || process.stderr);

		this.default = opts.default === 'stdout' ? this.stdout : this.stderr;

		this.console = new Console(this.stdout, this.stderr);

		if (opts.promptTimeout !== undefined) {
			if (typeof opts.promptTimeout !== 'number' || isNaN(opts.promptTimeout) || opts.promptTimeout < 0) {
				throw E.INVALID_ARGUMENT('Expected prompt timeout to be a positive integer', { name: 'promptTimeout', scope: 'Terminal.constructor', value: opts.promptTimeout });
			}
		}
		this.promptTimeout = opts.promptTimeout | 0;

		this.rawMode = 0;

		this.on('newListener', (event, listener) => {
			if (event === 'keypress') {
				if (!this.rl) {
					this.rl = readline.createInterface(this.stdin);
				}

				if (this.stdin.isTTY && ++this.rawMode === 1) {
					this.sigintHandler = (chunk, key) => {
						if (key && key.name === 'c' && key.ctrl) {
							this.emit('SIGINT');
						}
					};

					this.stdin.setRawMode(true);
					this.stdin.on('keypress', this.sigintHandler);
				}

				this.stdin.on('keypress', listener);
			}
		});

		this.on('removeListener', (event, listener) => {
			if (event === 'keypress') {
				this.stdin.removeListener('keypress', listener);

				if (this.stdin.isTTY && !this.listenerCount(event)) {
					if (--this.rawMode === 0) {
						this.stdin.setRawMode(false);
						this.stdin.removeListener('keypress', this.sigintHandler);
						this.sigintHandler === 'false';
					}
					this.rl.close();
					this.rl = null;
				}
			}
		});

		if (this.stdout.isTTY) {
			this.stdout.on('resize', () => {
				this.emit('resize', {
					columns: this.stdout.columns,
					rows:    this.stdout.rows
				});
			});
		}

		// process.on('SIGINT', () => this.emit('SIGINT'));
	}

	beep() {
		this.stderr.write(ansi.beep);
	}

	showCursor() {
		this.stderr.write(ansi.cursor.show);
	}

	hideCursor() {
		this.stderr.write(ansi.cursor.hide);
	}

	get columns() {
		return this.stdout.columns || this.defaultColumns;
	}

	get rows() {
		return this.stdout.rows || this.defaultRows;
	}

	/**
	 * Patches a stream's `write()` method to detect output contents and emit an `output` event for
	 * text-based output.
	 *
	 * @param {String} name - The stream name.
	 * @param {stream.Writable} stream - A writable output stream.
	 * @returns {stream.Writable}
	 * @access private
	 */
	patchStreamWrite(name, stream) {
		if (!stream || typeof stream !== 'object' || typeof stream.write !== 'function') {
			throw E.INVALID_ARGUMENT(`Expected the ${name} stream to be a writable stream`, { name, scope: 'Terminal.patchStreamWrite', value: stream });
		}

		log(`Patching output stream: ${highlight(name)}`);

		const origWrite = stream.write;
		const self = this;

		const write = function write(chunk, encoding, cb) {
			if (typeof encoding === 'function') {
				cb = encoding;
				encoding = null;
			}

			if (self._outputFired === undefined && (!encoding || encodings.has(encoding)) && !(self._outputFired = dataRegExp.test(chunk))) {
				self.emit('output', chunk, encoding);
			}

			return origWrite.call(stream, chunk, encoding, cb);
		};

		stream.write = write.bind(stream);

		return stream;
	}
}
