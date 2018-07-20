import camelCase from 'lodash.camelcase';
import Context from './context';
import debug, { pluralize } from './debug';
import E from './errors';
import ParsedArgument from './parsed-argument';

import { declareCLIKitClass } from './util';
import { transformValue } from './types';

const { log } = debug('cli-kit:parser');
const { highlight, note } = debug.styles;

const dashOpt = /^(?:-|—)(.+?)(?:=(.+))?$/;
const negateRegExp = /^no-(.+)$/;
const optRE = /^(?:--|—)(?:([^=]+)(?:=([\s\S]*))?)?$/;

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
	 * Processes the arguments against the given context. If a command is found, it recursively
	 * calls itself.
	 *
	 * @param {Context} ctx - The context to process the command line arguments against.
	 * @returns {Promise}
	 * @access private
	 */
	async applyContext(ctx) {
		const { args } = this;
		const { lookup } = ctx;

		// print the context's info
		log(`Context: ${highlight(ctx.name)}`);
		if (!lookup.empty) {
			log(lookup.toString());
		}

		const dispatch = i => {
			const arg = args[i];

			if (!arg) {
				const cmd = this.contexts[0];
				if (cmd !== ctx) {
					log('Descending into next context\'s parser');
					return this.applyContext(cmd);
				}

				log('End of the line');
				return Promise.resolve();
			}

			return new Promise((resolve, reject) => {
				log(`Processing argument [${i}]: ${highlight(arg)}`);

				let isFlag = false;
				let m;
				let negated = false;
				let option;

				if (arg instanceof ParsedArgument) {
					if (arg.type === 'option' || arg.type === 'unknown') {
						m = arg.match;

						if (arg.isFlag) {
							option = lookup.short[m[1]] || null;
						} else {
							negated = m[1].match(negateRegExp);
							const name = negated ? negated[1] : m[1];
							option = lookup.long[name] || null;
						}

						if (option) {
							log(`Overriding option: ${highlight(option.name)}`);
						} else {
							// not an option in this context, leave it alone
							log(`Skipping ${arg.type === 'unknown' ? 'un' : ''}known option: ${highlight(arg.name)}`);
							return dispatch(i + 1).then(resolve, reject);
						}
					} else {
						if (arg.type === 'command') {
							log(`Skipping known command: ${highlight(arg.command.name)}`);
						} else if (arg.type === 'extra') {
							log('Skipping extra arguments');
						}
						return dispatch(i + 1).then(resolve, reject);
					}
				} else {
					m = arg.match(optRE);

					// check if `--`
					if (m && !m[1]) {
						args[i] = new ParsedArgument('extra', {
							args: args.splice(i + 1, args.length)
						});
						return dispatch(i + 1).then(resolve, reject);
					}

					// check if long option
					if (m) {
						// --something or --something=foo
						negated = m[1].match(negateRegExp);
						const name = negated ? negated[1] : m[1];
						option = lookup.long[name] || null;

					// check if short option
					} else if (m = arg.match(dashOpt)) {
						option = lookup.short[m[1]] || null;
						isFlag = true;
					}
				}

				if (option) {
					log(`Found option: ${highlight(option.name)} ${note(`(${option.datatype})`)} Negated? ${highlight(!!negated)}`);

					if (m[2]) {
						// --something=foo
						// -x=foo
						args[i] = new ParsedArgument('option', {
							input: [ arg ],
							isFlag,
							match: m,
							negated,
							option,
							value: option.transform(m[2], negated)
						});
					} else {
						// if value is `null`, then we are missing the value
						const input = [ arg ];
						let value = null;

						if (option.isFlag && option.datatype === 'bool') {
							input.push(value = isFlag || !negated);
						} else if (option.isFlag && option.type === 'count') {
							// do nothing
						} else if (i + 1 < args.length) {
							const nextArg = args.splice(i + 1, 1)[0];
							input.push(nextArg);

							if (nextArg instanceof ParsedArgument) {
								if (nextArg.type === 'unknown') {
									// maybe the unknown option is actually a value that just
									// happens to match the pattern for an option?
									value = option.transform(nextArg.input[0]);
								} else {
									// next arg has already been identified, so treat this option as
									// a flag
									value = true;
								}
							} else {
								value = option.transform(nextArg);
							}
						}

						args[i] = new ParsedArgument('option', {
							input,
							isFlag,
							match: m,
							option,
							value
						});
					}

					if (typeof option.callback === 'function') {
						log('TODO: Option has a callback!');
						/*
						let fired = false;

						const result = option.callback.call(option, {
							input: args[i].input,
							ctx,
							async next() {
								if (fired) {
									log('next() already fired');
									return;
								}

								fired = true;

								// go to next
							},
							option,
							value: args[i].value
						});

						if (result instanceof Promise) {
							// TODO: wait for the promise to resolve
						}

						if (newValue !== undefined) {
							args[i].value = newValue;
						}
						*/

						// TODO: resolve or reject!!!!
						return dispatch(i + 1).then(resolve, reject);
					} else {
						return dispatch(i + 1).then(resolve, reject);
					}
				}

				// if the argument matched an option pattern, but didn't match a defined option,
				// then we can add it as an unknown option which will eventually become a flag
				if (option === null) {
					log(`Found unknown option: ${highlight(arg)}`);

					// treat unknown options as flags
					args[i] = new ParsedArgument('unknown', {
						input: [ arg ],
						match: m,
						name: negated ? negated[1] : m[1],
						negated,
						value: m[2]
					});

				} else {
					const cmd = lookup.commands[arg];

					// check if command and make sure we haven't already added a command this round
					if (this.contexts[0] === ctx && cmd) {
						log(`Found command: ${highlight(cmd.name)}`);

						args[i] = new ParsedArgument('command', {
							command: cmd,
							input: [ arg ]
						});

						// link the context hook emitters
						cmd.link(ctx);

						// add the context to the stack
						this.contexts.unshift(cmd);
					} else {
						log(`Found argument: ${highlight(arg)}`);
					}
				}

				return dispatch(i + 1).then(resolve, reject);
			});
		};

		await dispatch(0);
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

						if (option.env && process.env[option.env] !== undefined) {
							env[name] = option.transform(process.env[option.env]);
						}
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
			await this.applyContext(ctx);

			// from here, we want to deal with the most specific context
			ctx = this.contexts[0];

			// gather the default option values and environment variable values
			const env = this.applyDefaults();

			// loop over the parsed args and fill in the `argv` and `_`
			log('Filling argv and _');
			let i = 0;
			let extra = [];
			for (const parsedArg of this.args) {
				let name;
				if (parsedArg instanceof ParsedArgument) {
					switch (parsedArg.type) {
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
							this.argv[name] = value;

							if (ctx.get('treatUnknownOptionsAsArguments')) {
								this._.push(parsedArg.input[0]);
							}
							break;
					}
				} else {
					const arg = ctx.args[i++];
					if (arg) {
						name = arg.camelCase || ctx.get('camelCase') ? camelCase(arg.name) : arg.name;
						let value = arg.transform(parsedArg);

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
					} else {
						this._.push(parsedArg);
					}
				}
			}

			// add the extra items
			this._.push.apply(this._, extra);

			// check for missing arguments if help is not specifiec
			if (!this.argv.help) {
				// note that `i` has been incrementing above for each known argument
				for (const len = this.args.length; i < len; i++) {
					if (this.args[i].required) {
						throw E.MISSING_REQUIRED_ARGUMENT(`Missing required argument "${this.args[i].name}"`, { name: 'args', scope: 'Parser.parse', value: this.args[i] });
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
