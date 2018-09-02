import camelCase from 'lodash.camelcase';
import Context from './context';
import debug, { pluralize } from '../lib/debug';
import E from '../lib/errors';
import Extension from './extension';
import ParsedArgument from './parsed-argument';

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
	 * @access public
	 */
	constructor() {
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

		return env;
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
			const env = this.applyDefaults();

			// loop over the parsed args and fill in the `argv` and `_`
			log('Filling argv and _');
			let i = 0;
			let extra = [];

			const setArg = async (idx, value) => {
				const arg = ctx.args[idx];
				if (arg) {
					const name = arg.camelCase || ctx.get('camelCase') ? camelCase(arg.name) : arg.name;
					value = arg.transform(value);

					if (typeof arg.callback === 'function') {
						const newValue = await arg.callback.call(arg, value);
						if (newValue !== undefined) {
							value = newValue;
						}
					}

					if (arg.multiple) {
						// if this arg gobbles up multiple parsed args, then we decrement `i` so
						// that we never increment it and no further arguments will be applied
						i--;
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

			for (const parsedArg of this.args) {
				let name;
				const isParsed = parsedArg instanceof ParsedArgument;
				if (!isParsed || parsedArg.type === 'argument') {
					await setArg(i++, isParsed ? parsedArg.input[0] : parsedArg);
					continue;
				}

				switch (parsedArg.type) {
					case 'argument':
						break;

					case 'extra':
						extra = parsedArg.args;
						break;

					case 'option':
						name = parsedArg.option.camelCase || ctx.get('camelCase') ? camelCase(parsedArg.option.name) : parsedArg.option.name;
						if (parsedArg.option.type === 'count') {
							this.argv[name] = (this.argv[name] || 0) + 1;
						} else {
							this.argv[name] = parsedArg.value;
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

			// check for missing arguments if help is not specified
			if (!this.argv.help) {
				// note that `i` has been incrementing above for each known argument
				for (const len = ctx.args.length; i < len; i++) {
					if (ctx.args[i].required) {
						throw E.MISSING_REQUIRED_ARGUMENT(`Missing required argument "${ctx.args[i].name}"`, { name: 'args', scope: 'Parser.parse', value: ctx.args[i] });
					}
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
	 * @returns {Promise}
	 * @access private
	 */
	parseArg(ctx, i) {
		if (i === this.args.length) {
			const cmd = this.contexts[0];
			if (cmd !== ctx) {
				log('Descending into next context\'s parser');
				return this.parseWithContext(cmd);
			}
			log('End of the line');
			return Promise.resolve();
		}

		const arg = this.createParsedArgument(ctx, i);
		if (arg) {
			if (arg.type !== 'command' || this.contexts[0] === ctx) {
				this.args[i] = arg;
			}

			// if we found a command and this context is not
			if (arg.type === 'command' && this.contexts[0] === ctx) {
				// link the context hook emitters
				arg.command.link(ctx);

				// add the context to the stack
				this.contexts.unshift(arg.command);

			} else if (arg.type === 'option' && typeof arg.option.callback === 'function') {
				return new Promise((resolve, reject) => {
					const { option } = arg;
					log(`Firing option ${highlight(option.format)} callback ${note(`(${option.parent.name})`)}`);
					let fired = false;

					Promise.resolve()
						.then(() => option.callback({
							input: arg.input,
							ctx,
							next: async () => {
								if (fired) {
									log('next() already fired');
									return;
								}

								fired = true;

								log(`Option ${highlight(option.format)} called next(), processing next arg`);
								await this.parseArg(ctx, i + 1);

								return this.args[i].value;
							},
							option,
							value: arg.value
						}))
						.then(async value => {
							if (value === undefined) {
								log(`Option ${highlight(option.format)} callback did not change the value`);
							} else {
								log(`Option ${highlight(option.format)} callback changed value ${highlight(arg.value)} to ${highlight(value)}`);
								arg.value = value;
							}

							if (!fired) {
								log(`Option ${highlight(option.format)} did not call next(), processing next arg`);
								await this.parseArg(ctx, i + 1);
							}

							return arg.value;
						})
						.catch(err => {
							if (err.code === 'ERR_NOT_AN_OPTION') {
								this.args[i] = new ParsedArgument('argument', {
									input: arg.input
								});
								return;
							}
							throw err;
						})
						.then(resolve, reject);
				});
			}
		}

		return this.parseArg(ctx, i + 1);
	}

	/**
	 * Detects what the argument is and returns an object that identifies what was found.
	 *
	 * @param {CLI|Command} ctx - The context to apply when parsing the command line arguments.
	 * @param {Number} i - The argument index number to parse.
	 * @returns {?ParsedArgument} Returns a `ParsedArgument` or `undefined` if the argument was
	 * already a `ParsedArgument` and didn't change.
	 * @access private
	 */
	createParsedArgument(ctx, i) {
		const { args } = this;
		if (i >= args.length) {
			throw E.RANGE_ERROR(`Expected argument index to be between 0 and ${args.length}`, { name: 'index', scope: 'Parser.createParsedArgument', value: i, range: [ 0, args.length - 1 ] });
		}

		const arg = args[i];
		const type = arg instanceof ParsedArgument && arg.type;
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
		let subject = arg instanceof ParsedArgument ? (arg.input ? arg.input[0] : null) : arg;

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
				log(`Skipping ${type === 'unknown' ? 'un' : ''}known option: ${highlight(arg.name)}`);
				return;
			}

			if (option) {
				log(`${type === 'option' ? 'Overriding' : 'Found'} option: ${highlight(option.name)} ${note(`(${option.datatype})`)} Negated? ${highlight(!!negated)}`);

				let input = [ subject ];
				let value;

				if (option.isFlag) {
					return new ParsedArgument('option', {
						input,
						option,
						value: option.transform(type && arg.value !== undefined ? arg.value : true, negated)
					});
				}

				if (type === 'option') {
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
							value = option.transform(nextArg.input[0]);
						} else {
							// next arg has already been identified, so treat this option as a flag
							value = true;
						}
					} else {
						input.push(nextArg);
						args.splice(i + 1, 1);
						value = option.transform(nextArg);
					}
				} else {
					value = option.transform(value);
				}

				return new ParsedArgument('option', {
					input,
					option,
					value
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
					value: m[2]
				});
			}
		}

		// check if the argument is a command
		if (type === 'command') {
			log(`Skipping known command: ${highlight(arg.command.name)}`);
			return;
		}

		// check if command and make sure we haven't already added a command this round
		const cmd = lookup.commands[subject];
		if (cmd) {
			if (cmd instanceof Extension) {
				cmd.execArgs.push.apply(cmd.execArgs, args.slice(i + 1));
				log(`Found extension: ${highlight(cmd.name)}`);
			} else {
				log(`Found command: ${highlight(cmd.name)}`);
			}
			return new ParsedArgument('command', {
				command: cmd,
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
