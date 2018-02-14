import Argument from './argument';
import Arguments from './arguments';
import camelCase from 'lodash.camelcase';
import Command from './command';
import debug from './debug';
import HookEmitter from 'hook-emitter';
import Option from './option';

const { log } = debug('cli-kit:context');

const optRE = /^(?:--|—)(?:([^=]+)(?:=([\s\S]*))?)?$/;
const dashOpt = /^(?:-|—)(.+?)(?:=(.+))?$/;
const negateRegExp = /^no-(.+)$/;

/**
 * Defines a context that contains commands, options, and args. Serves as the
 * base class for `CLI` and `Context` objects.
 *
 * @extends {HookEmitter}
 */
export default class Context extends HookEmitter {
	/**
	 * Constructs a context instance.
	 *
	 * @param {Object} [opts] - Various options.
	 * @param {Array<Object>} [opts.args] - An array of arguments.
	 * @param {Boolean} [opts.camelCase=true] - Camel case option names.
	 * @param {Object} [opts.commands] - A map of command names to command descriptors.
	 * @param {String} [params.desc] - The description of the CLI or command displayed in the help
	 * output.
	 * @param {String} [opts.name] - The name of the context such as the program or the command name.
	 * @param {Array<Object>|Object} [opts.options] - An array of options.
	 * @param {Context} [opts.parent] - Parent context.
	 * @param {String} [opts.title] - The context title.
	 * @param {Boolean} [opts.allowUnknownOptions=false] - When `true`, any unknown flags or options
	 * will be treated as an option. When `false`, unknown flags/options will be treated as
	 * arguments.
	 * @access public
	 */
	constructor(opts = {}) {
		if (opts.args && !Array.isArray(opts.args)) {
			throw new TypeError('Expected args to be an array');
		}

		if (opts.commands && (typeof opts.commands !== 'object' || Array.isArray(opts.commands))) {
			throw new TypeError('Expected commands to be an object');
		}

		if (opts.options && typeof opts.options !== 'object') {
			throw new TypeError('Expected options to be an object or an array');
		}

		super();

		Object.assign(this, opts);

		this.args      = [];
		this.commands  = {};
		this.options   = [];
		this.groups    = {};

		// initialize the alias lookup tables
		Object.defineProperty(this, 'lookup', {
			value: {
				commands: {},
				long:     {},
				short:    {},
				toString: () => {
					let s = [];
					if (Object.keys(this.lookup.commands).length) {
						s.push('  Commands:');
						for (const name of Object.keys(this.lookup.commands)) {
							s.push(`    ${name} => ${this.lookup.commands[name].name}`);
						}
					}
					if (Object.keys(this.lookup.long).length || Object.keys(this.lookup.short).length) {
						s.push('  Options:');
						for (const name of Object.keys(this.lookup.long)) {
							s.push(`    --${name} => ${this.lookup.long[name].name}`);
						}
						for (const name of Object.keys(this.lookup.short)) {
							s.push(`    -${name} => ${this.lookup.short[name].name}`);
						}
					}
					return s.length ? `Context Lookup:\n${s.join('\n')}` : '';
				}
			}
		});

		this.camelCase = opts.camelCase !== false;

		// initialize the commands
		if (opts.commands) {
			for (const name of Object.keys(opts.commands)) {
				this.command(name, opts.commands[name]);
			}
		}

		// initialize the options
		if (Array.isArray(opts.options)) {
			let group = null;
			for (const groupOrOption of opts.options) {
				if (!groupOrOption || (typeof groupOrOption !== 'string' && typeof groupOrOption !== 'object') || Array.isArray(groupOrOption)) {
					throw new TypeError('Expected options array element to be a string or an object');
				}
				if (typeof groupOrOption === 'string') {
					group = groupOrOption;
				} else {
					for (const format of Object.keys(groupOrOption)) {
						this.option(format, group, groupOrOption[format]);
					}
				}
			}
		} else if (typeof opts.options === 'object') {
			for (const format of Object.keys(opts.options)) {
				this.option(format, opts.options[format]);
			}
		}

		if (Array.isArray(opts.args)) {
			for (const arg of opts.args) {
				this.argument(arg);
			}
		}
	}

	/**
	 * Adds an argument to this context.
	 *
	 * @param {Argument|Object|String} arg - An `Argument` instance or params to pass into an
	 * `Argument` constructor.
	 * @returns {Context}
	 * @access public
	 */
	argument(arg = {}) {
		this.args.push(arg instanceof Argument ? arg : new Argument(arg));
		return this;
	}

	/**
	 * Adds a command to this context.
	 *
	 * @param {Command|Object|String} cmd - A `Command` instance, `Command` constructor options, or
	 * a command name.
	 * @param {Object} [opts] - When `cmd` is the command name, then this is the options to pass
	 * into the `Command` constructor.
	 * @returns {Context}
	 * @access public
	 */
	command(cmd, opts) {
		if (cmd instanceof Command) {
			cmd.parent = this;
		} else {
			let name = cmd;
			if (name && typeof name === 'object' && !Array.isArray(name)) {
				opts = name;
				name = opts.name;
			}

			if (!name || typeof name !== 'string') {
				throw new TypeError('Expected name to be a non-empty string');
			}

			if (typeof opts === 'function') {
				opts = {
					action: opts
				};
			} else if (!opts) {
				opts = {};
			}

			if (typeof opts !== 'object' || Array.isArray(opts)) {
				throw new TypeError('Expected argument to be an object');
			}

			opts.allowUnknownOptions = this.allowUnknownOptions;
			opts.parent = this;

			cmd = new Command(name, opts);
		}

		log(`Adding command: ${cmd.name}`);
		this.commands[cmd.name] = cmd;

		this.lookup.commands[cmd.name] = cmd;
		if (cmd.aliases) {
			for (const alias of Object.keys(cmd.aliases)) {
				if (!this.commands[alias]) {
					this.lookup.commands[alias] = cmd;
				}
			}
		}

		return this;
	}

	/**
	 * Adds an option to this context.
	 *
	 * @param {Option|String} optOrFormat - An `Option` instance or the option format.
	 * @param {String} [group] - If `params` is present, then this value is the name of the group to
	 * assign the option to. If `params` is not present, then this value will be treated as the
	 * description.
	 * @param {Object} [params] - When `optOrFormat` is a format string, then this argument is
	 * passed into the `Option` constructor.
	 * @returns {Context}
	 * @access public
	 *
	 * @example
	 *   ctx.option('--foo');
	 *   ctx.option('--foo', 'enables foo mode');
	 *   ctx.option('--foo', { desc: 'enables foo mode' });
	 *   ctx.option('--foo', 'Silly Options', { desc: 'enables foo mode' });
	 *   ctx.option(new Option('--foo'));
	 *   ctx.option(new Option('--foo'), 'Silly Options');
	 */
	option(optOrFormat, group, params) {
		if (group) {
			if (typeof group === 'object') {
				params = group;
				group = null;
			} else if (typeof group !== 'string') {
				throw new TypeError('Expected group to be a non-empty string');
			} else if (!params) {
				params = { desc: group };
				group = null;
			}
		}

		const opt = optOrFormat instanceof Option ? optOrFormat : new Option(optOrFormat, params);

		this.options.push(opt);

		this.groups[group || opt.group || ''] = opt;

		if (opt.long) {
			this.lookup.long[opt.long] = opt;
		}

		if (opt.short) {
			this.lookup.short[opt.short] = opt;
		}

		let alias;
		for (alias of Object.keys(opt.aliases.long)) {
			this.lookup.long[alias] = opt;
		}

		for (alias of Object.keys(opt.aliases.short)) {
			this.lookup.short[alias] = opt;
		}

		return this;
	}

	/**
	 * Parses the arguments. This function recursively calls itself for each discovered sub-context.
	 *
	 * @param {Array.<String>|Arguments} $args - The first time this function is called, it is
	 * passed in an array of strings, namely `process.argv` starting with the 3rd argument or an
	 * arbitrary array of arguments. Each subsequent call will be passed an `Arguments` object
	 * which keeps track of what has been parsed.
	 * @returns {Promise.<Arguments>}
	 * @access private
	 */
	parse($args) {
		if (!($args instanceof Arguments)) {
			$args = new Arguments($args);
			$args.contexts.push(this);
		}

		const command = $args.contexts[0];

		log(this.lookup.toString());

		// the parse arg hook
		const parseArg = this.hook('parseArg', async ($args, ctx, arg, i, args) => {
			// if we have an unknown option, then we need to reconstruct it to
			// make our regexes below work
			if (arg && arg.type === 'unknown option') {
				arg = arg.orig;

			// arg is null, empty, or already processed, so skip it
			} else if (!arg || typeof arg === 'object') {
				return $args;
			}

			log('Parsing argument:', arg);

			let m = arg.match(optRE);

			// check if `--`
			if (m && !m[1]) {
				args[i] = { type: 'extra', value: args.slice(i + 1) };
				args.fill(null, i + 1);
				return $args;
			}

			let option;
			let negated = false;
			let isFlag = false;

			// check if long option
			if (m) {
				// --something or --something=foo
				negated = m[1].match(negateRegExp);
				const name = negated ? negated[1] : m[1];
				option = this.lookup.long[name];

			// check if short option
			} else if (m = arg.match(dashOpt)) {
				option = this.lookup.short[m[1]];
				isFlag = true;
			}

			if (option) {
				log(`Found option: ${option.name} (${option.type})`);
				log(`Negated? ${!!negated}`);

				if (m[2]) {
					// --something=foo
					// -x=foo
					args[i] = { type: 'option', option, value: option.transform(m[2], negated) };
				} else {
					// if value is `null`, then we are missing the value
					let value = null;

					if (option.type === 'bool') {
						value = isFlag || !negated;
					} else if (i + 1 < args.length) {
						value = option.transform(args[i + 1]);
						args[i + 1] = null;
					}

					args[i] = { type: 'option', option, value };
				}

				if (typeof option.callback === 'function') {
					const newValue = await option.callback(args[i].value);
					if (newValue !== undefined) {
						args[i].value = newValue;
					}
				}
				return $args;

			} else if (this.allowUnknownOptions) {
				// treat unknown options as flags
				args[i] = { type: 'unknown option', name: m[1], orig: arg };
				return $args;
			}

			// check if command
			const cmd = $args.contexts[0].lookup.commands[arg];
			if (cmd) {
				log(`Found command: ${cmd.name}`);
				args[i] = { type: 'command', command: cmd };
				$args.contexts.unshift(cmd);
				return $args;
			}

			return $args;
		});

		return this.hook('parse', $args => {
			log('Parsing:', $args.args);
			return $args.args
				.reduce((promise, arg, i, args) => {
					return promise
						.then($args => parseArg($args, this, arg, i, args))
						.then($a => $a || $args);
				}, Promise.resolve($args))
				.then($args => $args.prune())
				.then(async ($args) => {
					const cmd = $args.contexts[0];

					if (cmd && cmd !== command) {
						log('Descending into next context\'s parser');
						cmd.link(this);
						return cmd.parse($args);
					}

					log('Finalizing parsing');

					const env = {};

					// loop over each context and gather the option defaults and
					// environment variable valuedefault options
					log(`Processing default options and environment variables for ${$args.contexts.length} contexts`);
					for (let i = $args.contexts.length; i; i--) {
						for (const option of $args.contexts[i - 1].options) {
							if (option.name) {
								const name = option.camelCase || this.camelCase ? camelCase(option.name) : option.name;
								if (option.default !== undefined) {
									$args.argv[name] = option.default;
								} else if (option.type === 'bool') {
									$args.argv[name] = !!option.negate;
								}
								if (option.env && process.env[option.env] !== undefined) {
									env[name] = option.transform(process.env[option.env]);
								}
							}
						}
					}

					// fill argv and _
					log('Filling argv and _');
					let i = 0;
					let name;
					for (const parsedArg of $args.args) {
						if (typeof parsedArg === 'object') {
							switch (parsedArg.type) {
								case 'option':
									name = parsedArg.option.camelCase || this.camelCase ? camelCase(parsedArg.option.name) : parsedArg.option.name;
									$args.argv[name] = parsedArg.value;
									break;

								case 'unknown option':
									name = parsedArg.camelCase || this.camelCase ? camelCase(parsedArg.name) : parsedArg.name;
									$args.argv[name] = true;
									break;
							}
						} else {
							const arg = this.args[i++];
							if (arg) {
								name = arg.camelCase || this.camelCase ? camelCase(arg.name) : arg.name;
								let value = arg.transform(parsedArg);

								if (typeof arg.callback === 'function') {
									const newValue = await arg.callback(value);
									if (newValue !== undefined) {
										value = newValue;
									}
								}

								if (arg.multiple) {
									// if this arg gobbles up multiple parsed args, then we
									// decrement `i` so that we never increment it and no further
									// arguments will be applied
									i--;
									if (Array.isArray($args.argv[name])) {
										$args.argv[name].push(value);
									} else {
										$args.argv[name] = [ value ];
									}
								} else {
									$args.argv[name] = value;
								}
							} else {
								$args._.push(parsedArg);
							}
						}
					}

					// process env vars
					log('Mixing in environment variable values');
					Object.assign($args.argv, env);

					return $args;
				});
		})($args);
	}

	/**
	 * Renders the help screen for this context including the parent contexts.
	 *
	 * @param {WritableStream} out - The stream to write output to.
	 * @access private
	 */
	renderHelp(out) {
		let ctx = this;
		while (ctx.parent) {
			ctx = ctx.parent;
		}
		const width = Math.max(ctx.width || process.stdout.columns || 100, 40);

		const add = (bucket, columns) => {
			for (let i = 0, l = columns.length; i < l; i++) {
				const len = columns[i] !== undefined && columns[i] !== null ? String(columns[i]).length : 0;
				if (!bucket.maxWidths[i] || len > bucket.maxWidths[i]) {
					bucket.maxWidths[i] = len;
				}
			}
			bucket.list.push(columns);
		};

		const commands = {
			list: [],
			maxWidths: []
		};
		for (const name of Object.keys(this.commands)) {
			const { desc, hidden } = this.commands[name];
			if (!hidden) {
				add(commands, [ name, desc ]);
			}
		}

		const args = {
			list: [],
			maxWidths: []
		};
		for (const { desc, hidden, name } of this.args) {
			if (!hidden) {
				add(args, [ `<${name}>`, desc ]);
			}
		}

		const options = {
			list: [],
			maxWidths: []
		};
		for (const opt of this.options) {
			if (!opt.hidden) {
				if (opt.negate) {
					add(options, [ `--no-${opt.name}`, opt.desc ]);
				} else {
					let s = '';
					if (opt.short) {
						s += `-${opt.short}`;
					}
					if (opt.long) {
						s += (s.length ? ', ' : '') + `--${opt.long}`;
					}
					if (opt.type !== 'bool') {
						s += `=<${opt.hint || 'value'}>`;
					}
					add(options, [ s, opt.desc ]);
				}
			}
		}

		let usage = 'Usage: ';
		if (this.parent) {
			// add in the chain of commands
			usage += (function walk(ctx) {
				return (ctx.parent ? walk(ctx.parent) + ' ' : '') + ctx.name;
			}(this));

			usage += this.args
				.filter(arg => !arg.hidden)
				.map(arg => {
					return arg.required ? ` <${arg.name}>` : ` [<${arg.name}>]`;
				})
				.join('');
		} else {
			usage += `${this.name}${commands.list.length ? ' <command>' : ''}`;
		}
		usage += options.list.length ? ' [options]' : '';
		out.write(`${usage}\n\n`);

		if (this.desc) {
			out.write(`${wrap(this.desc, width)}\n\n`);
		}

		const list = (label, bucket) => {
			if (bucket.list.length) {
				out.write(`${label}:\n`);
				const max = bucket.maxWidths[0];
				for (const line of bucket.list) {
					let [ name, desc ] = line;
					name = `  ${name.padEnd(max)}`;
					if (desc) {
						out.write(`${name}  ${wrap(desc, width, name.length + 2)}\n`);
					} else {
						out.write(`${name}\n`);
					}
				}
				out.write('\n');
			}
		};

		list('Commands', commands);
		list(this.title ? `${this.title} arguments` : 'Arguments', args);
		list(this.title ? `${this.title} options` : 'Options', options);
	}
}

/**
 * Inserts line breaks into a string so that the text does not exceed the specified width.
 *
 * @param {String} str - The string to line wrap.
 * @param {Number} [width] - The width to break the lines; defaults to the terminal width.
 * @param {Number} [indent] - The number of spaces to indent new lines.
 * @returns {String}
 */
function wrap(str, width, indent) {
	if (width <= 0) {
		return str;
	}

	indent = ' '.repeat(indent || 0);

	return str
		.split(/\r?\n/)
		.map(line => {
			let i = 0;
			let j = 0;
			let k;
			let next;

			while (i < line.length) {
				if (line.charAt(i) === '\u001b') {
					// fast forward!
					i += 5;
				} else {
					i++;
					if (++j >= width) {
						// backpedal
						for (k = i; k >= 0; k--) {
							if (/[ ,;!?]/.test(line[k]) || (/[.:]/.test(line[k]) && (k + 1 >= line.length || /[ \t\r\n]/.test(line[k + 1])))) {
								if (k + 1 < line.length) {
									line = line.substring(0, k) + '\n' + indent + line.substring(k + 1);
									i = k + 1;
									j = 0;
								}
								break;
							}
						}
					}
				}
			}

			return line;
		})
		.join('\n');
}
