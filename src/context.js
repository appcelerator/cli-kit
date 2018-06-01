import Argument from './argument';
import Arguments from './arguments';
import camelCase from 'lodash.camelcase';
import debug from './debug';
import E from './errors';
import HookEmitter from 'hook-emitter';
import Option from './option';
import ParsedArgument from './parsed-argument';

import { declareCLIKitClass, wrap } from './util';
import { defaultStyles } from './styles';

/**
 * `Command` and `Extension` are lazy loaded due to circular references.
 */
let Command;
let Extension;

const { chalk } = debug;
const { log } = debug('cli-kit:context');
const { highlight, note } = debug.styles;

const dashOpt = /^(?:-|—)(.+?)(?:=(.+))?$/;
const negateRegExp = /^no-(.+)$/;
const optRE = /^(?:--|—)(?:([^=]+)(?:=([\s\S]*))?)?$/;
const propIgnoreRegExp = /^_events|_links|args|commands|lookup|options|styles$/;

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
	 * @param {Object} [params] - Various parameters.
	 * @param {Array<Object>} [params.args] - An array of arguments.
	 * @param {Boolean} [params.camelCase=true] - Camel case option names.
	 * @param {Object} [params.commands] - A map of command names to command descriptors.
	 * @param {String} [params.desc] - The description of the CLI or command displayed in the help
	 * output.
	 * @param {Object|Array.<String>} [params.extensions] - An map of extension names to extension
	 * paths or an array of extension paths. A extension path is either a path to a directory
	 * containing a Node.js module, a path to a .js file, or the name of a executable.
	 * @param {String} [params.name] - The name of the context such as the program or the command name.
	 * @param {Array<Object>|Object} [params.options] - An array of options.
	 * @param {Context} [params.parent] - The parent context.
	 * @param {Object} [params.styles] - A map of style overrides.
	 * @param {String} [params.title] - The context title.
	 * @param {Boolean} [params.allowUnknownOptions=false] - When `true`, any unknown flags or options
	 * will be treated as an option. When `false`, unknown flags/options will be treated as
	 * arguments.
	 * @access public
	 */
	constructor(params = {}) {
		if (!params || typeof params !== 'object' || (params.clikit instanceof Set && !params.clikit.has('Context'))) {
			throw E.INVALID_ARGUMENT('Expected parameters to be an object, CLI, Command, or Context', { name: 'params.clikit', scope: 'Context.constructor', value: params.clikit });
		}

		if (params.args && !Array.isArray(params.args)) {
			throw E.INVALID_ARGUMENT('Expected args to be an array', { name: 'params.args', scope: 'Context.constructor', value: params.args });
		}

		if (params.commands && (typeof params.commands !== 'object' || Array.isArray(params.commands))) {
			throw E.INVALID_ARGUMENT('Expected commands to be an object', { name: 'params.commands', scope: 'Context.constructor', value: params.commands });
		}

		if (params.options && typeof params.options !== 'object') {
			throw E.INVALID_ARGUMENT('Expected options to be an object or an array', { name: 'params.options', scope: 'Context.constructor', value: params.options });
		}

		if (params.extensions && typeof params.extensions !== 'object') {
			throw E.INVALID_ARGUMENT('Expected extensions to be an object or an array', { name: 'params.extensions', scope: 'Context.constructor', value: params.extensions });
		}

		if (params.styles && typeof params.styles !== 'object') {
			throw E.INVALID_ARGUMENT('Expected styles to be an object', { name: 'params.styles', scope: 'CLI.constructor', value: params.styles });
		}

		super();

		const ignoreOut = params.clikit instanceof Set && params.clikit.has('Context');

		for (const prop of Object.keys(params)) {
			if (!propIgnoreRegExp.test(prop) || (prop === 'out' && ignoreOut)) {
				this[prop] = params[prop];
			}
		}

		declareCLIKitClass(this, 'Context');

		this.args     = [];
		this.commands = {};
		this.options  = {};

		this.styles = Object.assign({}, defaultStyles, params.styles);

		// initialize the alias lookup tables
		Object.defineProperty(this, 'lookup', {
			configurable: true,
			writable: true,
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

		this.camelCase = params.camelCase !== false;

		// initialize the commands
		if (params.commands) {
			for (const name of Object.keys(params.commands)) {
				this.command(name, params.commands[name]);
			}
		}

		if (params.clikit instanceof Set && (params.clikit.has('CLI') || params.clikit.has('Command'))) {
			// the options are coming from an existing CLI or Command object, so we need to copy
			// them into this context, but only if they option does not already exist in a parent
			// context
			const isCLI = params.clikit.has('CLI');
			for (const [ group, options ] of Object.entries(params.options)) {
				for (const option of options) {
					let add = true;

					if (isCLI) {
						// scan all parents to see if this flag is a dupe
						let found = false;
						for (let p = this.parent; p && !found; p = p.parent) {
							for (const opts of Object.values(p.options)) {
								for (const opt of opts) {
									if (opt.name === option.name) {
										found = true;
										break;
									}
								}
							}
						}
						add = !found;
					}

					if (add) {
						this.option(option, group);
					}
				}
			}
		} else {
			// initialize the options
			if (Array.isArray(params.options)) {
				let group = null;
				for (const groupOrOption of params.options) {
					if (!groupOrOption || (typeof groupOrOption !== 'string' && typeof groupOrOption !== 'object') || Array.isArray(groupOrOption)) {
						throw E.INVALID_ARGUMENT('Expected options array element to be a string or an object', { name: 'params.options', scope: 'Context.constructor', value: groupOrOption });
					}
					if (typeof groupOrOption === 'string') {
						group = groupOrOption;
					} else {
						for (const format of Object.keys(groupOrOption)) {
							this.option(format, group, groupOrOption[format]);
						}
					}
				}
			} else if (typeof params.options === 'object') {
				for (const format of Object.keys(params.options)) {
					this.option(format, params.options[format]);
				}
			}
		}

		if (Array.isArray(params.args)) {
			for (const arg of params.args) {
				this.argument(arg);
			}
		}

		// load extensions... this must happen last
		if (Array.isArray(params.extensions)) {
			for (const extensionPath of params.extensions) {
				this.extension(extensionPath);
			}
		} else if (typeof params.extensions === 'object') {
			for (const name of Object.keys(params.extensions)) {
				this.extension(params.extensions[name], name);
			}
		}
	}

	/**
	 * Adds an argument to this context.
	 *
	 * @param {Argument|Object|String} arg - An `Argument` instance or options to pass into an
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
	 * @param {Object} [params] - When `cmd` is the command name, then this is the options to pass
	 * into the `Command` constructor.
	 * @returns {Context}
	 * @access public
	 */
	command(cmd, params) {
		if (!Command) {
			Command = require('./command').default;
		}

		if (cmd instanceof Command) {
			cmd.parent = this;
		} else {
			let name = cmd;
			if (name && typeof name === 'object' && !Array.isArray(name)) {
				params = name;
				name = params.name;
			}

			if (typeof params === 'function') {
				params = {
					action: params
				};
			} else if (!params) {
				params = {};
			}

			if (typeof params !== 'object' || Array.isArray(params)) {
				throw E.INVALID_ARGUMENT('Expected command parameters to be an object', { name: 'params', scope: 'Context.command', value: params });
			}

			params.allowUnknownOptions = this.allowUnknownOptions;
			params.parent = this;

			cmd = new Command(name, params);
		}

		log(`Adding command: ${highlight(cmd.name)}`);
		return this.registerCommand(cmd);
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
				throw E.INVALID_ARGUMENT('Expected group to be a non-empty string', { name: 'group',  scope: 'Context.command', value: group });
			} else if (!params) {
				params = { desc: group };
				group = null;
			}
		}

		const opt = optOrFormat instanceof Option ? optOrFormat : new Option(optOrFormat, params);
		group || (group = opt.group || '');

		if (!Array.isArray(this.options[group])) {
			this.options[group] = [];
		}
		this.options[group].push(opt);

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
	 * Registers an external package as a command context that invokes the package.
	 *
	 * @param {Extension|String} ext - A extension instance or the path to the extension to wire up.
	 * @param {String} [name] - The extension name used for the context name. If not set, it will
	 * attempt to find a `package.json` with a `cli-kit.name` value
	 * @returns {Context}
	 * @access public
	 */
	extension(ext, name) {
		if (!Extension) {
			Extension = require('./extension').default;
		}

		if (ext instanceof Extension) {
			ext.parent = this;
		} else {
			if (ext && typeof ext === 'object') {
				name = ext.name;
				ext = ext.path;
			}

			ext = new Extension({
				extensionPath: ext,
				name,
				parent: this
			});
		}

		log(`Adding extension: ${highlight(ext.name)}`);
		return this.registerCommand(ext);
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

		// the parse arg hook
		const parseArg = this.hook('parseArg', async ($args, ctx, arg, i, args) => {
			// if we have an unknown option, then we need to reconstruct it to
			// make our regexes below work
			if (arg && arg.type === 'unknown option') {
				arg = arg.orig;

			// arg is null, empty, or already processed, so skip it
			} else if (!arg || arg instanceof ParsedArgument) {
				return $args;
			}

			log(`Parsing argument: ${highlight(arg)}`);

			let m = arg.match(optRE);

			// check if `--`
			if (m && !m[1]) {
				args[i] = new ParsedArgument('extra', { value: args.slice(i + 1) });
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
				log(`Found option: ${highlight(option.name)} ${note(`(${option.datatype})`)}`);
				log(`Negated? ${highlight(!!negated)}`);

				if (m[2]) {
					// --something=foo
					// -x=foo
					args[i] = new ParsedArgument('option', { option, value: option.transform(m[2], negated) });
				} else {
					// if value is `null`, then we are missing the value
					let value = null;

					if (option.isFlag && option.datatype === 'bool') {
						value = isFlag || !negated;
					} else if (i + 1 < args.length) {
						value = option.transform(args[i + 1]);
						args[i + 1] = null;
					}

					args[i] = new ParsedArgument('option', { option, value });
				}

				if (typeof option.callback === 'function') {
					const newValue = await option.callback.call(option, args[i].value);
					if (newValue !== undefined) {
						args[i].value = newValue;
					}
				}
				return $args;

			} else if (this.allowUnknownOptions) {
				// treat unknown options as flags
				args[i] = new ParsedArgument('unknown option', { name: m[1], orig: arg });
				return $args;
			}

			// check if command
			const cmd = $args.contexts[0].lookup.commands[arg];
			if (cmd) {
				log(`Found command: ${highlight(cmd.name)}`);
				args[i] = new ParsedArgument('command', { command: cmd });
				$args.contexts.unshift(cmd);
				return $args;
			}

			return $args;
		});

		const hook = this.hook('parse', $args => {
			log(`Parsing: ${highlight($args.args.map(a => a.toString()).join(', '))}`);

			const lookup = this.lookup.toString();
			if (lookup) {
				log(lookup);
			}

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
					log(`Processing default options and environment variables for ${highlight($args.contexts.length)} contexts`);
					for (let i = $args.contexts.length; i; i--) {
						for (const [ group, options ] of Object.entries($args.contexts[i - 1].options)) {
							for (const option of options) {
								if (option.name) {
									const name = option.camelCase || this.camelCase ? camelCase(option.name) : option.name;
									if (option.default !== undefined) {
										$args.argv[name] = option.default;
									} else if (option.datatype === 'bool') {
										$args.argv[name] = !!option.negate;
									}
									if (option.env && process.env[option.env] !== undefined) {
										env[name] = option.transform(process.env[option.env]);
									}
								}
							}
						}
					}

					// fill argv and _
					log('Filling argv and _');
					let i = 0;
					let name;

					for (const parsedArg of $args.args) {
						if (parsedArg instanceof ParsedArgument) {
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
									const newValue = await arg.callback.call(arg, value);
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

					// check for missing arguments
					for (const len = this.args.length; i < len; i++) {
						if (this.args[i].required) {
							throw E.MISSING_REQUIRED_ARGUMENT(`Missing required argument "${this.args[i].name}"`, { name: 'args', scope: 'Context.parse', value: this.args[i] });
						}
					}

					// process env vars
					log('Mixing in environment variable values');
					Object.assign($args.argv, env);

					return $args;
				});
		});

		return hook($args).catch(err => {
			err.contexts = $args.contexts;
			throw err;
		});
	}

	/**
	 * Registers a command or extension to add to this context's list of commands and alias lookup.
	 *
	 * @param {Command} cmd - The command instance.
	 * @return {Context}
	 * @access private
	 */
	registerCommand(cmd) {
		if (this.commands[cmd.name]) {
			throw E.ALREADY_EXISTS(`Command "${cmd.name}" already exists`, { name: 'cmd',  scope: 'Context.registerCommand', value: cmd });
		}

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
	 * Applies the specified style to the string.
	 *
	 * @param {String} type - The style type to apply.
	 * @param {String} str - The string to apply the style to.
	 * @returns {String}
	 * @access private
	 */
	style(type, str) {
		if (!this.get('colors', true)) {
			return str;
		}

		const style = this.get('styles', {})[type];

		if (!style || style === 'default') {
			return str;
		}

		if (Array.isArray(style)) {
			return style.length >= 3 ? chalk.rgb.apply(chalk, style)(str) : str;
		}

		for (const s of style.split('.')) {
			if (s.charAt(0) === '#') {
				str = chalk.hex(s)(str);
			} else {
				str = chalk.keyword(s)(str);
			}
		}

		return str;
	}

	/**
	 * Renders the help screen for this context including the parent contexts.
	 *
	 * @param {Object} [params] - Various parameters.
	 * @param {Error} [params.err] - An optional error to render before the help output.
	 * @param {WritableStream} [params.out] - The stream to write output to.
	 * @param {Boolean} [params.recursing] - Indicates that this function is being called by itself
	 * from a sub-context and that the current context's usage, description, and commands should be
	 * suppressed.
	 * @returns {Promise}
	 * @access private
	 */
	async renderHelp({ err, out, recursing } = {}) {
		if (!out) {
			out = this.outputStream || process.stdout;
		}

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
		for (const name of Object.keys(this.commands).sort()) {
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
				add(args, [ name, desc ]);
			}
		}

		const options = {
			list: [],
			maxWidths: []
		};
		for (const [ group, params ] of Object.entries(this.options)) {
			for (const opt of params) {
				if (!opt.hidden) {
					if (opt.negate) {
						add(options, [ `--no-${opt.name}`, opt.desc ]);
					} else {
						let s = '';
						if (opt.short) {
							s += `-${opt.short}`;
						}
						if (opt.long) {
							s += `${s.length ? ', ' : ''}--${opt.long}`;
						}
						if (opt.datatype !== 'bool') {
							s += `=<${opt.hint || 'value'}>`;
						}
						add(options, [ s, opt.desc ]);
					}
				}
			}
		}

		const list = (heading, bucket) => {
			if (bucket.list.length) {
				out.write(`${this.style('heading', heading)}:\n`);
				const max = bucket.maxWidths[0];
				for (const line of bucket.list) {
					let [ name, desc ] = line;
					if (desc) {
						name = `  ${name.padEnd(max)}`;
						out.write(`${this.style('key', name)}  ${this.style('desc', wrap(desc, width, name.length + 2))}\n`);
					} else {
						out.write(`  ${this.style('key', name)}\n`);
					}
				}
				out.write('\n');
			}
		};

		if (err) {
			out.write(`${this.style('error', err.toString())}\n\n`);
		}

		if (!recursing) {
			let usage = '';
			if (this.parent) {
				// add in the chain of commands
				usage += (function walk(ctx) {
					return (ctx.parent ? walk(ctx.parent) + ' ' : '') + ctx.name;
				}(this));
			} else {
				usage += this.name;
			}
			usage += commands.list.length ? ' <command>' : '';
			usage += options.list.length ? ' [options]' : '';
			usage += this.args
				.filter(arg => !arg.hidden)
				.map(arg => {
					return arg.required ? ` <${arg.name}>` : ` [<${arg.name}>]`;
				})
				.join('');

			out.write(`Usage: ${this.style('usage', usage)}\n\n`);

			if (this.desc) {
				out.write(`${this.style('desc', wrap(this.desc.substring(0, 1).toUpperCase() + this.desc.substring(1), width))}\n\n`);
			}

			list('Commands', commands);
		}

		list(this.title ? `${this.title} arguments` : 'Arguments', args);

		list(this.title ? `${this.title} options` : 'Options', options);

		if (this.parent) {
			await this.parent.renderHelp({
				out,
				recursing: true
			});
		}
	}

	/**
	 * Scans up the context tree for the first instance of a matching defined property.
	 *
	 * @param {String} name - The property name.
	 * @param {*} defaultValue - A default value if no value is found.
	 * @returns {*}
	 * @access private
	 */
	get(name, defaultValue) {
		let value = this[name];
		for (let p = this.parent; p; p = p.parent) {
			value = p.get(name, value);
		}
		return value !== undefined ? value : defaultValue;
	}

	/**
	 * Returns the output stream.
	 *
	 * @returns {Stream}
	 * @access private
	 */
	get outputStream() {
		return this.get('out');
	}
}
