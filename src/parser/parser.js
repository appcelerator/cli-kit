import camelCase from 'lodash.camelcase';
import Command from './command.js';
import Context from './context.js';
import debug from '../lib/debug.js';
import E from '../lib/errors.js';
import Extension from './extension.js';
import HookEmitter from 'hook-emitter';
import ParsedArgument from './parsed-argument.js';
import pluralize from 'pluralize';
import { declareCLIKitClass } from '../lib/util.js';
import { transformValue } from './types.js';

const { log } = debug('cli-kit:parser');
const { highlight, note } = debug.styles;

const dashOpt = /^(?:-|—)(.+?)(?:=(.+))?$/;
const negateRegExp = /^no-(.+)$/;
const optRE = /^(?:--|—)(?:([^=]+)(?:=([\s\S]*))?)$/;

/**
 * A collection of parsed CLI arguments.
 *
 * @extends {HookEmitter}
 */
export default class Parser extends HookEmitter {
	/**
	 * An object containing all of the parsed options, flags, and named arguments.
	 *
	 * @type {Object}
	 */
	argv = {};

	/**
	 * A list of options and arguments in which their callbacks were fired during parsing so that
	 * we don't fire the callbacks again when setting the default values.
	 * @type {Set}
	 */
	_fired = new Set();

	/**
	 * An object containing only unknown parsed options and flags.
	 *
	 * @type {Object}
	 */
	unknown = {};

	/**
	 * An array of parsed arguments.
	 *
	 * @type {Array}
	 */
	_ = [];

	/**
	 * Initializes the internal properties and class name.
	 *
	 * @param {Object} [opts] - Various options.
	 * @param {Object} [opts.data] - User-defined data to pass into the selected command.
	 * @param {Function} [opts.exitCode] - A function that sets the exit code.
	 * @param {Termianl} [opts.terminal] - A terminal instance to override the default CLI terminal
	 * instance.
	 * @access public
	 */
	constructor(opts = {}) {
		super();

		Object.defineProperties(this, {
			/**
			 * The array of arguments. As arguments are identified, they are replaced with
			 * `ParsedArgument` instances and in the case of options with values and extra options,
			 * the array is shortened.
			 * @type {Array.<String|ParsedArgument>}
			 */
			args: {
				value: null,
				writable: true
			},

			/**
			 * A stack of contexts applied to the arguments. The first element is the most specific
			 * context, usually a command. The last element is typically the root `CLI` instance.
			 * @type {Array.<Context>}
			 */
			contexts: {
				value: null,
				writable: true
			},

			/**
			 * A map of option and argument environment variable values derived from all options
			 * and arguments found across all contexts.
			 * @type {Object}
			 */
			env: {
				value: null,
				writable: true
			},

			/**
			 * Options possibly containing a `data` payload, `exitCode`, and `terminal` instance.
			 * @type {Object}
			 */
			opts: {
				value: opts
			},

			/**
			 * A list of all required arguments and options that were missing. The caller (e.g.
			 * the `CLI` instance) is responsible for enforcing missing arguments.
			 * @type {Set}
			 */
			required: {
				value: null,
				writable: true
			}
		});

		declareCLIKitClass(this, 'Parser');
	}

	/**
	 * Loops over the contexts in reverse from the top-level to the most specific context and
	 * gathers the option defaults as well as any options specified as environment variables.
	 *
	 * @returns {Promise}
	 * @access private
	 */
	async applyDefaults() {
		const requiredOptions = {
			long: {},
			short: {}
		};
		const len = this.contexts.length;
		log(`Processing default options and environment variables for ${highlight(len)} ${pluralize('context', len)}`);

		this.env = {};

		// loop through every context
		for (let i = len; i; i--) {
			const ctx = this.contexts[i - 1];

			// init options
			for (const options of ctx.options.values()) {
				for (const option of options) {
					if (option.name) {
						const name = option.camelCase || ctx.get('camelCase') ? camelCase(option.name) : option.name;

						if (this.argv[name] === undefined) {
							let value = option.default;

							if (option.datatype === 'bool' && typeof value !== 'boolean') {
								value = !!option.negate;
							} else if (option.type === 'count') {
								value = 0;
							}

							if (option.multiple && !Array.isArray(value)) {
								value = value !== undefined ? [ value ] : [];
							}

							if (!this._fired.has(option) && typeof option.callback === 'function') {
								const newValue = await option.callback({
									ctx,
									data: this.opts.data,
									exitCode: this.opts.exitCode,
									input: [ value ],
									name,
									async next() {},
									opts: this.opts,
									option,
									parser: this,
									value
								});
								if (newValue !== undefined) {
									value = newValue;
								}
							}

							this.argv[name] = value;
						}

						if (option.env && process.env[option.env] !== undefined) {
							this.env[name] = option.transform(process.env[option.env]);
						}
					}

					if (option.required) {
						if (option.long) {
							requiredOptions.long[option.long] = option;
						}
						if (option.short) {
							requiredOptions.short[option.short] = option;
						}
					} else {
						if (option.long) {
							delete requiredOptions.long[option.long];
						}
						if (option.short) {
							delete requiredOptions.short[option.short];
						}
					}
				}
			}

			// init arguments
			for (const arg of ctx.args) {
				if (arg.name) {
					const name = arg.camelCase || ctx.get('camelCase') ? camelCase(arg.name) : arg.name;

					if (this.argv[name] === undefined) {
						let value = arg.default;

						if (arg.multiple && !Array.isArray(value)) {
							value = value !== undefined ? [ value ] : [];
						}

						if (!this._fired.has(arg) && typeof arg.callback === 'function') {
							const newValue = await arg.callback({
								arg,
								ctx,
								data: this.opts.data,
								exitCode: this.opts.exitCode,
								name,
								opts: this.opts,
								parser: this,
								value
							});
							if (newValue !== undefined) {
								value = newValue;
							}
						}

						this.argv[name] = value;
					}

					if (arg.env && process.env[arg.env] !== undefined) {
						this.env[name] = arg.transform(process.env[arg.env]);
					}
				}
			}
		}

		this.required = new Set(Object.values(requiredOptions.long));
		for (const option of Object.values(requiredOptions.short)) {
			this.required.add(option);
		}
	}

	/**
	 * Loops over the parsed arguments and populates the `argv` and `_` properties.
	 *
	 * @returns {Promise}
	 * @access private
	 */
	async fillArgv() {
		// from here, we want to deal with the most specific context
		const ctx = this.contexts[0];

		// loop over the parsed args and fill in the `argv` and `_`
		log('Filling argv and _');

		// combine parsed args that are options with multiple flag set
		for (let k = 0; k < this.args.length; k++) {
			let current = this.args[k];
			if (current instanceof ParsedArgument && current.type === 'option' && current.option.multiple) {
				for (let j = k + 1; j < this.args.length; j++) {
					let next = this.args[j];
					if (next instanceof ParsedArgument && next.type === 'option' && next.option === current.option) {
						if (!Array.isArray(current.value)) {
							current.value = [ current.value ];
						}
						if (next.value !== undefined) {
							current.value = [].concat(current.value, next.value);
						}
						this.args.splice(j--, 1);
					}
				}
			}
		}

		let index = 0;
		let extra = [];

		const setArg = async (idx, value) => {
			const arg = ctx.args[idx];

			// extract the parsed arg value
			if (value instanceof ParsedArgument) {
				value.arg = arg;
				value = value.input[0];
			}

			if (arg) {
				const name = arg.camelCase || ctx.get('camelCase') ? camelCase(arg.name) : arg.name;
				value = arg.transform(value);

				if (typeof arg.callback === 'function') {
					const newValue = await arg.callback({
						arg,
						ctx,
						data: this.opts.data,
						exitCode: this.opts.exitCode,
						name,
						opts: this.opts,
						parser: this,
						value
					});
					if (newValue !== undefined) {
						value = newValue;
					}
					this._fired.add(arg);
				}

				if (arg.multiple) {
					// if this arg gobbles up multiple parsed args, then we decrement `i` so
					// that we never increment it and no further arguments will be applied
					index--;
					if (Array.isArray(this.argv[name])) {
						this.argv[name].push(value);
					} else {
						this.argv[name] = [ value ];
					}
				} else {
					this.argv[name] = value;
				}
			}

			this._.push(value);
		};

		// loop over the parsed args and assign the values to _ and argv
		for (const parsedArg of this.args) {
			let name;
			const isParsed = parsedArg instanceof ParsedArgument;

			if (!isParsed || parsedArg.type === 'argument') {
				await setArg(index++, parsedArg);
				continue;
			}

			switch (parsedArg.type) {
				case 'argument':
					// already handled above
					break;

				case 'extra':
					extra = parsedArg.args;
					break;

				case 'option':
					{
						const { option } = parsedArg;
						name = option.camelCase || ctx.get('camelCase') ? camelCase(option.name) : option.name;

						let { value } = parsedArg;
						if (option.type === 'count') {
							value = (this.argv[name] || 0) + 1;
						}

						// non-multiple option callbacks have already been fired, now we need
						// to do it just for multiple value options
						if (typeof option.callback === 'function' && option.multiple) {
							log(`Firing option ${highlight(option.format)} callback ${note(`(${option.parent.name})`)}`);
							const newValue = await option.callback({
								ctx,
								data: this.opts.data,
								exitCode: this.opts.exitCode,
								input: [ value ],
								name,
								async next() {},
								opts: this.opts,
								option,
								parser: this,
								value
							});
							if (newValue !== undefined) {
								value = newValue;
							}
							this._fired.add(option);
						}

						if (value !== undefined) {
							// set the parsed value (overwrites the default value)
							this.argv[name] = value;
						}

						// argv[name] either has the new value or the default value, but either way we must re-check it
						if (this.argv[name] !== undefined && (!option.multiple || this.argv[name].length)) {
							this.required.delete(option);
						}

						// if argv[name] has no value and no default, at least set it to an empty string
						// note: this must be done after the required check above
						if (this.argv[name] === undefined && option.datatype === 'string') {
							this.argv[name] = option.transform('');
						}
					}
					break;

				case 'unknown':
					// since this is an unknown option, we try to guess it's type and if it's
					// a bool, we will honor the negate (e.g. --no-<name>)
					let { value } = parsedArg;
					value = value === undefined ? true : transformValue(value);
					if (typeof value === 'boolean' && parsedArg.negated) {
						value = !value;
					}

					// clean up the name
					name = ctx.get('camelCase') ? camelCase(parsedArg.name) : parsedArg.name;
					this.argv[name] = this.unknown[name] = value;

					if (ctx.get('treatUnknownOptionsAsArguments')) {
						this._.push(parsedArg.input[0]);
					}
					break;
			}
		}

		// add the extra items
		this._.push.apply(this._, extra);

		// process env vars
		log('Mixing in environment variable values');
		Object.assign(this.argv, this.env);
	}

	/**
	 * Parses the command line arguments.
	 *
	 * @param {Object} opts - Various options.
	 * @param {Array} opts.args - An array of raw, unparsed arguments.
	 * @param {Context} opts.ctx - The context to reference for commands, options, and arguments.
	 * @returns {Promise<Parser>}
	 * @access public
	 */
	async parse(opts) {
		const fn = this.hook('parse', async ({ args, ctx }) => {
			if (!Array.isArray(args)) {
				throw E.INVALID_ARGUMENT('Expected args to be an array', { name: 'args', scope: 'Parser.parse', value: args });
			}

			if (!(ctx instanceof Context)) {
				throw E.INVALID_ARGUMENT('Expected ctx to be a context', { name: 'ctx', scope: 'Parser.parse', value: ctx });
			}

			this.args = args;
			this.contexts = [ ctx ];

			log(`Processing ${pluralize('argument', args.length, true)}: ${highlight(this.args.join(', '))}`);

			// process the arguments against the context
			await this.parseWithContext(ctx);

			return this;
		});

		try {
			return await fn({
				...opts,
				data: this.opts.data,
				parser: this
			});
		} catch (err) {
			err.contexts = this.contexts;
			throw err;
		}
	}

	/**
	 * Processes the arguments against the given context. If a command is found, it recursively
	 * calls itself.
	 *
	 * @param {CLI|Command} ctx - The context to apply when parsing the command line arguments.
	 * @returns {Promise}
	 * @access private
	 */
	async parseWithContext(ctx) {
		// print the context's info
		log(`Context: ${highlight(ctx.name)}`);
		if (!ctx.lookup.empty) {
			log(ctx.lookup.toString());
		}

		await this.parseArg(ctx, 0);
	}

	/**
	 * Parses a single argument as apart of a chain of promises.
	 *
	 * @param {CLI|Command} ctx - The context to apply when parsing the command line arguments.
	 * @param {Number} i - The argument index number to parse.
	 * @param {Number} [to] - The index to go until.
	 * @returns {Promise}
	 * @access private
	 */
	async parseArg(ctx, i, to) {
		if (to !== undefined && i >= to) {
			// all caught up, return
			return;
		}

		let { rev } = ctx;
		let { length } = this.args;
		const checkRev = async (ctx, to) => {
			if (ctx.rev > rev) {
				// we always need a `to`
				if (to === undefined) {
					to = this.args.length;
				}
				log(`Rev changed from ${highlight(rev)} to ${highlight(ctx.rev)}, reparsing ${highlight(0)} through ${highlight(to)}`);
				rev = ctx.rev;
				await this.parseArg(ctx, 0, to);
			}
		};

		if (to === undefined && i >= length) {
			let cmd = this.contexts[0];

			// if there are no more contexts to descend, check if the top-most context is actually
			// a default subcommand
			if (cmd === ctx && cmd.action instanceof Command) {
				cmd = cmd.action;
				cmd.link(ctx);
				this.contexts.unshift(cmd);
			}

			if (cmd !== ctx) {
				log('Descending into next context\'s parser');
				return this.parseWithContext(cmd);
			}

			await this.hook('finalize', async () => {
				await checkRev(ctx); // check if pre-finalize changed the rev
				await this.applyDefaults();
				await checkRev(ctx); // check if applyDefaults changed the rev
				await this.fillArgv();
			})({ ctx, data: this.opts.data, parser: this });
			await checkRev(ctx); // check if post-finalize or fillArgv changed the rev

			log('End of the line');
			return;
		}

		// create a ParsedArgument object for the next argument
		const arg = await this.createParsedArgument(ctx, i);

		// if the length was shortened, then decrement `to`
		if (to !== undefined && this.args.length < length) {
			to -= (length - this.args.length);
			log(`Argument list was shortened from ${length} to ${this.args.length} (to=${to})`);
		}

		if (arg) {
			const { type } = arg;

			// check if the context changed (e.g. we found a command/extension) so that we continue
			// to process arguments against the current context before we descend into the newly
			// discovered command/extension context
			const sameContext = this.contexts[0] === ctx;

			if ((type !== 'command' && type !== 'extension') || sameContext) {
				this.args[i] = arg;
			}

			if ((type === 'command' || type === 'extension') && sameContext) {
				// link the context hook emitters
				const cmd = arg.command;
				cmd.link(ctx);
				if (typeof cmd.callback === 'function') {
					await cmd.callback({
						command: arg.command,
						data: this.opts.data,
						parser: this
					});
				}

				// add the context to the stack
				this.contexts.unshift(cmd);

			} else if (type === 'option' && !sameContext && this.contexts[0] instanceof Extension && !this.contexts[0].isCLIKitExtension) {
				log(`Forcing option ${highlight(arg.option.format)} to be an argument because we found a non-cli-kit extension ${highlight(this.contexts[0].name)}`);
				this.args[i] = new ParsedArgument('argument', {
					input: arg.input
				});

			} else if (type === 'option' && typeof arg.option.callback === 'function' && !arg.option.multiple) {
				const { option } = arg;
				log(`Firing option ${highlight(option.format)} callback ${note(`(${option.parent.name})`)}`);
				let fired = false;

				try {
					const value = await option.callback({
						ctx,
						data: this.opts.data,
						exitCode: this.opts.exitCode,
						input: arg.input,
						name: option.camelCase || ctx.get('camelCase') ? camelCase(option.name) : option.name,
						next: async () => {
							if (fired) {
								log('next() already fired');
								return;
							}

							fired = true;

							log(`Option ${highlight(option.format)} called next(), processing next arg`);
							await checkRev(ctx, i);
							await this.parseArg(ctx, i + 1, to);
							return this.args[i].value;
						},
						opts: this.opts,
						option,
						parser: this,
						value: arg.value
					});

					if (value === undefined) {
						log(`Option ${highlight(option.format)} callback did not change the value`);
					} else {
						log(`Option ${highlight(option.format)} callback changed value ${highlight(arg.value)} to ${highlight(value)}`);
						arg.value = value;
					}

					this._fired.add(option);

					if (fired) {
						return;
					}

					log(`Option ${highlight(option.format)} did not call next(), processing next arg`);
				} catch (err) {
					if (err.code !== 'ERR_NOT_AN_OPTION') {
						throw err;
					}

					this.args[i] = new ParsedArgument('argument', {
						input: arg.input
					});
				}
			}
		}

		await checkRev(ctx, i);
		await this.parseArg(ctx, i + 1, to);
	}

	/**
	 * Detects what the argument is and returns an object that identifies what was found.
	 *
	 * @param {CLI|Command} ctx - The context to apply when parsing the command line arguments.
	 * @param {Number} i - The argument index number to parse.
	 * @returns {Promise<?ParsedArgument>} Resolves a `ParsedArgument` or `undefined` if the
	 * argument was already a `ParsedArgument` and didn't change.
	 * @access private
	 */
	async createParsedArgument(ctx, i) {
		const { args } = this;
		if (i >= args.length) {
			throw E.RANGE_ERROR(`Expected argument index to be between 0 and ${args.length}`, { name: 'index', scope: 'Parser.createParsedArgument', value: i, range: [ 0, args.length - 1 ] });
		}

		const arg = args[i];
		const isParsed = arg instanceof ParsedArgument;
		const type = isParsed && arg.type;

		log(`Processing argument [${i}]: ${highlight(arg)}`);

		// check if the argument is a the `--` extra arguments sequence
		if (arg === '--') {
			const extra = args.splice(i + 1, args.length);
			return new ParsedArgument('extra', {
				args: extra,
				input: [ arg, ...extra ]
			});
		}

		if (type === 'extra') {
			log('Skipping extra arguments');
			return;
		}

		const { lookup } = ctx;
		let subject = isParsed ? (arg.input ? arg.input[0] : null) : arg;

		// check if the argument is an option
		if (!type || type === 'option' || type === 'unknown') {
			let m = subject.match(optRE);
			let negated = false;
			let option;

			if (m) {
				// --something or --something=foo
				negated = m[1].match(negateRegExp);
				const name = negated ? negated[1] : m[1];
				option = lookup.long[name] || null;

			// check if short option
			} else if (m = subject.match(dashOpt)) {
				if (m[1].length > 1) {
					log(`Splitting group: ${highlight(m[1])}`);
					const newArgs = m[1].split('').map((arg, i, arr) => i + 1 === arr.length && m[2] ? `-${arg}=${m[2]}` : `-${arg}`);
					subject = newArgs.shift();
					log(`Inserting arguments: ${newArgs.join(', ')}`);
					this.args.splice(i + 1, 0, ...newArgs);
				}

				option = lookup.short[m[1][0]] || null;
			}

			if (!option && type) {
				// not an option in this context, leave it alone
				log(`Skipping ${type === 'unknown' ? 'un' : ''}known option: ${highlight(arg.getName())}`);
				return;
			}

			if (option) {
				log(`${type === 'option' ? 'Overriding' : 'Found'} option: ${highlight(option.name)} ${note(`(${option.datatype})`)} Negated? ${highlight(!!negated)}`);

				let input = [ subject ];
				let value;

				if (option.isFlag) {
					value = option.transform(type && arg.value !== undefined ? arg.value : true, negated);
				} else if (type === 'option') {
					value = option.transform(args[i].value);
				} else if (m[2]) {
					value = option.transform(m[2], negated);
				} else if (i + 1 < args.length) {
					const nextArg = args[i + 1];
					if (nextArg instanceof ParsedArgument) {
						if (nextArg.type === 'argument') {
							input.push(...nextArg.input);
							args.splice(i + 1, 1);
							// maybe the unknown option is actually a value that just
							// happens to match the pattern for an option?
							value = option.transform(nextArg.input[0], negated);
						} else {
							// next arg has already been identified, so treat this option as a flag
							value = true;
						}
					} else {
						input.push(nextArg);
						args.splice(i + 1, 1);
						value = option.transform(nextArg, negated);
					}
				}

				if (value === undefined) {
					if (type && arg.value !== undefined) {
						value = option.transform(arg.value, negated);
					} else if (option.type === 'bool') {
						value = option.transform(true, negated);
					}
				}

				return new ParsedArgument('option', {
					input,
					option,
					value: value !== undefined && !Array.isArray(value) && option.multiple ? [ value ] : value
				});
			}

			// if the argument matched an option pattern, but didn't match a defined option, then we
			// can add it as an unknown option which will eventually become a flag
			if (option === null && !type) {
				log(`Found unknown option: ${highlight(subject)}`);
				return new ParsedArgument('unknown', {
					input: [ subject ],
					name: negated ? negated[1] : m[1],
					negated,
					value: m[2] === undefined && isParsed ? arg.value : m[2]
				});
			}
		}

		// check if the argument is a command
		if (type === 'command' || type === 'extension') {
			log(`Skipping known ${type}: ${highlight(arg.command.name)}`);
			return;
		}

		// check if command and make sure we haven't already added a command this round
		const cmd = lookup.commands[subject];
		if (cmd) {
			log(`Found command: ${highlight(cmd.name)}`);
			return new ParsedArgument('command', {
				command: cmd,
				input: isParsed ? arg.input : [ arg ]
			});
		}

		const ext = lookup.extensions[subject];
		if (ext) {
			log(`Found extension: ${highlight(ext.name)}`);
			if (typeof ext.load === 'function') {
				await ext.load(subject);
			}
			return new ParsedArgument('extension', {
				command: ext,
				input: isParsed ? arg.input : [ arg ]
			});
		}

		if (!type) {
			log(`Found unknown argument: ${highlight(arg)}`);
			return new ParsedArgument('argument', {
				input: isParsed ? arg.input : [ arg ]
			});
		}
	}

	/**
	 * Reconstructs the arguments into a string.
	 *
	 * @returns {String}
	 * @access public
	 */
	toString() {
		return this.valueOf().join(' ');
	}

	/**
	 * Returns a reconstruction of `process.argv`.
	 *
	 * @returns {Array.<String>}
	 * @access public
	 */
	valueOf() {
		return this.args.map(arg => String(arg));
	}
}
