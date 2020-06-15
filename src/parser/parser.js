import camelCase from 'lodash.camelcase';
import Command from './command';
import Context from './context';
import debug from '../lib/debug';
import E from '../lib/errors';
import Extension from './extension';
import ParsedArgument from './parsed-argument';
import pluralize from 'pluralize';

import { declareCLIKitClass } from '../lib/util';
import { transformValue } from './types';

const { log } = debug('cli-kit:parser');
const { highlight, note } = debug.styles;

const dashOpt = /^(?:-|—)(.+?)(?:=(.+))?$/;
const negateRegExp = /^no-(.+)$/;
const optRE = /^(?:--|—)(?:([^=]+)(?:=([\s\S]*))?)$/;

/**
 * A collection of parsed CLI arguments.
 */
export default class Parser {
	/**
	 * An object containing all of the parsed options, flags, and named arguments.
	 *
	 * @type {Object}
	 */
	argv = {};

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
		Object.defineProperties(this, {
			/**
			 * The array of arguments. As arguments are identified, they are replaced with
			 * `ParsedArgument` instances and in the case of options with values and extra options,
			 * the array is shortened.
			 *
			 * @type {Array.<String|ParsedArgument>}
			 */
			args: {
				value: [],
				writable: true
			},

			/**
			 * A stack of contexts applied to the arguments. The first element is the most specific
			 * context, usually a command. The last element is typically the root `CLI` instance.
			 *
			 * @type {Array.<Context>}
			 */
			contexts: {
				value: []
			},

			/**
			 * Options possibly containing a `data` payload, `exitCode`, and `terminal` instance.
			 *
			 * @type {Object}
			 */
			opts: {
				value: opts
			}
		});

		declareCLIKitClass(this, 'Parser');
	}

	/**
	 * Loops over the contexts in reverse from the top-level to the most specific context and
	 * gathers the option defaults as well as any options specified as environment variables.
	 *
	 * @returns {Object} A map of option names to values derived from environment variables.
	 * @access private
	 */
	applyDefaults() {
		const env = {};
		const len = this.contexts.length;
		log(`Processing default options and environment variables for ${highlight(len)} ${pluralize('context', len)}`);

		const requiredOptions = {
			long: {},
			short: {}
		};

		for (let i = len; i; i--) {
			const ctx = this.contexts[i - 1];

			// init options
			for (const options of ctx.options.values()) {
				for (const option of options) {
					if (option.name) {
						const name = option.camelCase || ctx.get('camelCase') ? camelCase(option.name) : option.name;

						if (option.default !== undefined) {
							this.argv[name] = option.default;
						} else if (option.datatype === 'bool') {
							this.argv[name] = !!option.negate;
						} else if (option.type === 'count') {
							this.argv[name] = 0;
						}

						if (option.multiple && !Array.isArray(this.argv[name])) {
							this.argv[name] = this.argv[name] !== undefined ? [ this.argv[name] ] : [];
						}

						if (option.env && process.env[option.env] !== undefined) {
							env[name] = option.transform(process.env[option.env]);
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

					if (arg.default !== undefined) {
						this.argv[name] = arg.default;
					}

					if (arg.multiple && !Array.isArray(this.argv[name])) {
						this.argv[name] = this.argv[name] !== undefined ? [ this.argv[name] ] : [];
					}

					if (arg.env && process.env[arg.env] !== undefined) {
						env[name] = arg.transform(process.env[arg.env]);
					}
				}
			}
		}

		const required = new Set(Object.values(requiredOptions.long));
		for (const option of Object.values(requiredOptions.short)) {
			required.add(option);
		}

		return { env, required };
	}

	/**
	 * Parses the command line arguments.
	 *
	 * @param {Array} args - An array of raw, unparsed arguments.
	 * @param {Context} ctx - The context to reference for commands, options, and arguments.
	 * @returns {Promise<Parser>}
	 * @access public
	 */
	parse(args, ctx) {
		return ctx.hook('parse', async args => {
			if (!Array.isArray(args)) {
				throw E.INVALID_ARGUMENT('Expected args to be an array', { name: 'args', scope: 'Parser.parse', value: args });
			}

			if (!(ctx instanceof Context)) {
				throw E.INVALID_ARGUMENT('Expected ctx to be a context', { name: 'ctx', scope: 'Parser.parse', value: ctx });
			}

			this.args = args;
			log(`Processing ${pluralize('argument', args.length, true)}: ${highlight(this.args.join(', '))}`);

			// add the context to the stack
			this.contexts.unshift(ctx);

			// process the arguments against the context
			await this.parseWithContext(ctx);

			// from here, we want to deal with the most specific context
			ctx = this.contexts[0];

			// gather the default option values and environment variable values
			const { env, required } = this.applyDefaults();

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
				if (arg) {
					const name = arg.camelCase || ctx.get('camelCase') ? camelCase(arg.name) : arg.name;
					value = arg.transform(value);

					if (typeof arg.callback === 'function') {
						const newValue = await arg.callback({
							arg,
							ctx,
							exitCode: this.opts.exitCode,
							opts: this.opts,
							value
						});
						if (newValue !== undefined) {
							value = newValue;
						}
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
					await setArg(index++, isParsed ? parsedArg.input[0] : parsedArg);
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
									exitCode: this.opts.exitCode,
									input: [ value ],
									async next() {},
									opts: this.opts,
									option,
									value
								});
								if (newValue !== undefined) {
									value = newValue;
								}
							}

							if (value !== undefined) {
								// set the parsed value (overwrites the default value)
								this.argv[name] = value;
							}

							// argv[name] either has the new value or the default value, but either way we must re-check it
							if (this.argv[name] !== undefined && (!option.multiple || this.argv[name].length)) {
								required.delete(option);
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

			// check for missing arguments and options if help is not specified
			if (!this.argv.help) {
				// note that `index` has been incrementing above for each known argument, however
				// if the last index was a multi value argument, then it gobbled up all the args
				// and any remaining args would be starved anyways, so skip the validation
				const len = ctx.args.length;
				for (; index < len; index++) {
					if (ctx.args[index].required && (!ctx.args[index].multiple || !this.argv[ctx.args[index].name].length)) {
						throw E.MISSING_REQUIRED_ARGUMENT(
							`Missing required argument "${ctx.args[index].name}"`,
							{ name: 'args', scope: 'Parser.parse', value: ctx.args[index] }
						);
					}
				}

				if (required.size) {
					throw E.MISSING_REQUIRED_OPTION(
						`Missing ${required.size} required option${required.size === 1 ? '' : 's'}:`,
						{ name: 'options', scope: 'Parser.parse', required: required.values() }
					);
				}
			}

			// process env vars
			log('Mixing in environment variable values');
			Object.assign(this.argv, env);

			return this;
		})(args).catch(err => {
			err.contexts = this.contexts;
			throw err;
		});
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

		if (to === undefined && i >= this.args.length) {
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

			log('End of the line');
			return;
		}

		let { rev } = ctx;
		let { length } = this.args;

		// create a ParsedArgument object for the next argument
		const arg = await this.createParsedArgument(ctx, i);

		if (to !== undefined && this.args.length < length) {
			to -= (length - this.args.length);
		}

		if (arg) {
			const { type } = arg;
			const sameContext = this.contexts[0] === ctx;

			if ((type !== 'command' && type !== 'extension') || sameContext) {
				this.args[i] = arg;
			}

			if ((type === 'command' || type === 'extension') && sameContext) {
				// link the context hook emitters
				arg[type].link(ctx);

				// add the context to the stack
				this.contexts.unshift(arg[type]);

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
						exitCode: this.opts.exitCode,
						input: arg.input,
						next: async () => {
							if (fired) {
								log('next() already fired');
								return;
							}

							fired = true;

							log(`Option ${highlight(option.format)} called next(), processing next arg`);

							// check if the option callback added any new commands, options, or arguments
							if (ctx.rev > rev) {
								log(`Rev changed from ${highlight(rev)} to ${highlight(ctx.rev)}, reparsing ${highlight(0)} through ${highlight(i - 1)}`);
								await this.parseArg(ctx, 0, i);
							}

							await this.parseArg(ctx, i + 1, to);

							return this.args[i].value;
						},
						opts: this.opts,
						option,
						value: arg.value
					});

					if (value === undefined) {
						log(`Option ${highlight(option.format)} callback did not change the value`);
					} else {
						log(`Option ${highlight(option.format)} callback changed value ${highlight(arg.value)} to ${highlight(value)}`);
						arg.value = value;
					}

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

		if (ctx.rev > rev) {
			log(`Rev changed from ${highlight(rev)} to ${highlight(ctx.rev)}, reparsing ${highlight(0)} through ${highlight(i - 1)}`);
			await this.parseArg(ctx, 0, i);
		}

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
			return new ParsedArgument('extra', {
				args: args.splice(i + 1, args.length)
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
							input.push(nextArg);
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
			log(`Skipping known ${type}: ${highlight(arg[type].name)}`);
			return;
		}

		// check if command and make sure we haven't already added a command this round
		const cmd = lookup.commands[subject];
		if (cmd) {
			log(`Found command: ${highlight(cmd.name)}`);
			return new ParsedArgument('command', {
				command: cmd,
				input: [ arg ]
			});
		}

		const ext = lookup.extensions[subject];
		if (ext) {
			await ext.load();
			log(`Found extension: ${highlight(ext.name)}`);
			return new ParsedArgument('extension', {
				extension: ext,
				input: [ arg ]
			});
		}

		if (!type) {
			log(`Found unknown argument: ${highlight(arg)}`);
			return new ParsedArgument('argument', {
				input: [ arg ]
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
