import ArgumentList from './argument-list';
import CommandMap from './command-map';
import debug from '../lib/debug';
import E from '../lib/errors';
import ExtensionMap from './extension-map';
import HookEmitter from 'hook-emitter';
import Lookup from './lookup';
import OptionMap from './option-map';

import { declareCLIKitClass } from '../lib/util';

const { log } = debug('cli-kit:context');
const { highlight, note } = debug.styles;

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
	 * @param {Object|Context} [params] - Various parameters.
	 * @param {Object|String|Argument|ArgumentList|Array<Object|String|Argument>} [params.args] -
	 * An object of argument names to argument descriptors, an argument name, an `Argument`
	 * instance, an `ArgumentList` instance, or array of object descriptors, argument names, and
	 * `Argument` instances.
	 * @param {Boolean} [params.camelCase=true] - Camel case option names.
	 * @param {Object|String|Command|CommandMap|Array.<Object|String|Command>} [params.commands] -
	 * An object used for `Command` constructor params, a path to a directory or a `.js` file, a
	 * `Command` instance, or an array of those types. May also be a `CommandMap` instance. If
	 * `cmd` is a `String` and `params` is present, then it will treat `cmd` as the command name,
	 * not a file path.
	 * @param {String} [params.desc] - The description of the CLI or command displayed in the help
	 * output. If context is a command with a help header defined, this description is not
	 * displayed.
	 * @param {Object|String|Extension|ExtensionMap|Array.<String|Extension>} [params.extensions] -
	 * An object of extension names to extension paths or instances, an extension path, an
	 * `Extension` instance, or an array of those types. An extension path may be a directory
	 * containing a Node.js module, a path to a `.js` file, or the name of a executable. May also
	 * be an `ExtensionMap` instance.
	 * @param {String} [params.name] - The name of the context such as the program or the command
	 * name.
	 * @param {Object|Option|OptionMap|Array<Object|Option|String>} [params.options] - An object of
	 * format to `Option` constructor params, an `Option` instance, or an array of `Option`
	 * constructor params and `Option` instances grouped by `String` labels.
	 * @param {Context} [params.parent] - The parent context.
	 * @param {String} [params.title] - The context title.
	 * @param {Boolean} [params.treatUnknownOptionsAsArguments=false] - When `true`, any argument is
	 * encountered during parsing that resembles a option that does not exist, it will add it
	 * untouched to `_` as an argument as well as to `argv` as a boolean flag. When `false`, it will
	 * only add the argument to `argv` as a boolean flag.
	 * @access public
	 */
	constructor(params = {}) {
		super();
		declareCLIKitClass(this, 'Context');
		this.init(params);
	}

	/**
	 * Adds an argument to this context.
	 *
	 * @param {Object|String|Argument|ArgumentList|Array<Object|String|Argument>} arg - An object
	 * of argument names to argument descriptors, an argument name, an `Argument` instance, an
	 * `ArgumentList` instance, or array of object descriptors, argument names, and `Argument`
	 * instances.
	 * @returns {Context}
	 * @access public
	 */
	argument(arg) {
		this.args.add(arg);
		this.rev++;
		return this;
	}

	/**
	 * Adds a command to this context.
	 *
	 * @param {Object|String|Command|CommandMap|Array.<Object|String|Command>} cmd - An object
	 * used for `Command` constructor params, a path to a directory or a `.js` file, a `Command`
	 * instance, or an array of those types. May also be a `CommandMap` instance. If `cmd` is a
	 * `String` and `params` is present, then it will treat `cmd` as the command name, not a file
	 * path.
	 * @param {Object} [params] - When `cmd` is the command name, then this is the options to pass
	 * into the `Command` constructor.
	 * @returns {Context}
	 * @access public
	 */
	command(cmd, params) {
		const cmds = this.commands.add(cmd, params);
		for (const cmd of cmds) {
			log(`Adding command: ${highlight(cmd.name)} ${note(`(${this.name})`)}`);
			this.register(cmd);
		}
		this.rev++;
		return this;
	}

	/**
	 * Registers an external package as a command context that invokes the package.
	 *
	 * @param {Object|String|Extension|ExtensionMap|Array.<String|Extension>} ext - An object of
	 * extension names to extension paths or instances, an extension path, an `Extension` instance,
	 * or an array of those types. An extension path may be a directory containing a Node.js
	 * module, a path to a `.js` file, or the name of a executable. May also be an `ExtensionMap`
	 * instance.
	 * @param {String} [name] - The extension name used for the context name. If not set, it will
	 * attempt to find a `package.json` with a `cli-kit.name` value.
	 * @returns {Context}
	 * @access public
	 */
	extension(ext, name) {
		const exts = this.extensions.add(ext, name);
		for (const ext of exts) {
			log(`Adding extension: ${highlight(ext.name)} ${note(`(${this.name})`)}`);
			this.register(ext);
		}
		this.rev++;
		return this;
	}

	/**
	 * Renders the help screen for this context including the parent contexts.
	 *
	 * @param {Object} [opts] - Various parameters.
	 * @returns {Promise<Object>}
	 * @access private
	 */
	generateHelp(opts = {}) {
		return this.hook('generateHelp', results => {
			const scopes = [];
			let ctx = this;

			while (ctx) {
				scopes.push({
					title: `${ctx.title} options`,
					name: ctx.name,
					...ctx.options.generateHelp()
				});
				results.contexts.unshift(ctx.name);
				ctx = ctx.parent;
			}

			// remove duplicate options
			const longs = new Set();
			const shorts = new Set();
			let j = scopes.length;
			while (j--) {
				for (const options of Object.values(scopes[j].groups)) {
					for (let i = 0; i < options.length; i++) {
						const { long, short } = options[i];
						let nuke = false;
						if (long !== null) {
							if (longs.has(long)) {
								nuke = true;
							} else {
								longs.add(long);
							}
						}
						if (short !== null) {
							if (shorts.has(short)) {
								nuke = true;
							} else {
								shorts.add(short);
							}
						}
						if (nuke) {
							scopes[j].count--;
							options.splice(i--, 1);
						}
					}
				}
			}

			// set the description
			results.desc = this.desc ? String(this.desc).trim().replace(/^\w/, c => c.toLocaleUpperCase()) : null;

			// set the commands
			results.commands = {
				title: this.parent ? `${this.title} commands` : 'Commands',
				...this.commands.generateHelp()
			};

			const ext = this.extensions.generateHelp();
			results.commands.count += ext.count;
			results.commands.entries.push(...ext.entries);

			// update the default command
			if (this.defaultCommand) {
				for (const cmd of results.commands.entries) {
					if (cmd.name === this.defaultCommand) {
						cmd.default = true;
						break;
					}
				}
			}

			// set the arguments
			results.arguments = {
				title: this.parent ? `${this.title} arguments` : 'Arguments',
				...this.args.generateHelp()
			};

			// set the options
			results.options = {
				count: scopes.reduce((p, c) => p + c.count, 0),
				scopes
			};

			// set the usage line
			const usage = [];
			if (Array.isArray(opts.parentContextNames)) {
				usage.push.apply(usage, opts.parentContextNames);
			}
			usage.push.apply(usage, results.contexts.slice());
			results.commands.count && usage.push('<command>');
			results.options.count && usage.push('[options]');
			usage.push.apply(usage, results.arguments.entries.map(arg => {
				const name = `<${arg.name}${arg.multiple ? '...' : ''}>`;
				return arg.required ? name : `[${name}]`;
			}));
			results.usage = {
				title: 'Usage',
				text: usage.join(' ')
			};

			return results;
		})({
			contexts: [],
			error: undefined,
			suggestions: [],
			warnings: undefined
		});
	}

	/**
	 * Scan parent contexts to find the specified property in the top-most context.
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
	 * Initializes this context with params.
	 *
	 * @param {Object|Context} params - Various parameters
	 * @access private
	 */
	init(params) {
		if (!params || typeof params !== 'object' || (params.clikit instanceof Set && !params.clikit.has('Context'))) {
			throw E.INVALID_ARGUMENT('Expected parameters to be an object or Context', { name: 'params', scope: 'Context.init', value: params });
		}

		if (params.clikit instanceof Set && !params.clikit.has('Context')) {
			throw E.INVALID_ARGUMENT('Expected parameters to be an object or Context', { name: 'params', scope: 'Context.init', value: params });
		}

		this.args                           = new ArgumentList();
		this.autoHideBanner                 = params.autoHideBanner;
		this.banner                         = params.banner;
		this.commands                       = new CommandMap();
		this.defaultCommand                 = params.defaultCommand;
		this.desc                           = params.desc;
		this.errorIfUnknownCommand          = params.errorIfUnknownCommand;
		this.extensions                     = new ExtensionMap();
		this.helpExitCode                   = params.helpExitCode;
		this.helpTemplateFile               = params.helpTemplateFile;
		this.hideNoBannerOption             = params.hideNoBannerOption;
		this.hideNoColorOption              = params.hideNoColorOption;
		this.lookup                         = new Lookup();
		this.name                           = params.name;
		this.nodeVersion                    = params.nodeVersion;
		this.options                        = new OptionMap();
		this.parent                         = params.parent;
		this.rev                            = 0;
		this.showBannerForExternalCLIs      = params.showBannerForExternalCLIs;
		this.showHelpOnError                = params.showHelpOnError;
		this.title                          = params.title || params.name;
		this.treatUnknownOptionsAsArguments = !!params.treatUnknownOptionsAsArguments;
		this.version                        = params.version;

		params.args       && this.argument(params.args);
		params.commands   && this.command(params.commands);
		params.extensions && this.extension(params.extensions);
		params.options    && this.option(params.options);
	}

	/**
	 * Adds an option to this context.
	 *
	 * @param {String|Object|Option|OptionMap|Array<Object|Option|String>} format - An option
	 * format, an object of format to option descriptions, `Option` constructor params or `Option`
	 * instances, an `Option` instance, an `OptionMap` instance, or an array of `Option`
	 * constructor params and `Option` instances grouped by `String` labels.
	 * @param {Object|Option|String} [params] - When `format` is a format string, then this
	 * argument is either `Option` constructor parameters, an `Option` instance, or an option
	 * description.
	 * @returns {Context}
	 * @access public
	 *
	 * @example
	 *   ctx.option('--foo'); // format flag
	 *   ctx.option('--foo', 'enables foo mode'); // format with description
	 *   ctx.option('--foo', { desc: 'enables foo mode' }); // format with Option ctor params
	 *   ctx.option({ '--foo': null }); // object with format flag
	 *   ctx.option({ '--foo': { desc: 'enables foo mode' } }); // object with Option ctor params
	 *   ctx.option({ '--foo': new Option() }); // object of `Option` instance
	 *   ctx.option(new Option('--foo')); // `Option` instance
	 *   ctx.option(new OptionMap()); // `OptionMap` from another instance
	 *   ctx.option([ 'Some Group', new Option('--foo'), 'Another Group', { '--bar': null } ]); // an array of grouped options
	 */
	option(format, params) {
		const opts = this.options.add(format, params);

		for (const opt of opts) {
			opt.parent = this;

			if (opt.long) {
				this.lookup.long[opt.long] = opt;
			}

			if (opt.short) {
				this.lookup.short[opt.short] = opt;
			}

			for (const [ alias, visible ] of Object.entries(opt.aliases.long)) {
				if (visible) {
					this.lookup.long[alias] = opt;
				}
			}

			for (const [ alias, visible ] of Object.entries(opt.aliases.short)) {
				if (visible) {
					this.lookup.short[alias] = opt;
				}
			}
		}

		this.rev++;

		return this;
	}

	/**
	 * Scan parent contexts to find the specified property in the bottom-most context.
	 *
	 * @param {String} name - The property name.
	 * @param {*} defaultValue - A default value if no value is found.
	 * @returns {*}
	 * @access private
	 */
	prop(name, defaultValue) {
		let value = this[name];
		for (let p = this.parent; value === undefined && p; p = p.parent) {
			value = p.prop(name, value);
		}
		return value !== undefined ? value : defaultValue;
	}

	/**
	 * Registers a command or extension to add to the lookup.
	 *
	 * @param {Command|Extension} it - The command or extension instance.
	 * @access private
	 */
	register(it) {
		let dest;
		if (it.clikit.has('Extension')) {
			dest = 'extensions';
		} else if (it.clikit.has('Command')) {
			dest = 'commands';
		}

		if (!dest) {
			return;
		}

		it.parent = this;
		this.lookup[dest][it.name] = it;

		if (it.aliases) {
			for (const alias of Object.keys(it.aliases)) {
				if (!this[dest].has(alias)) {
					this.lookup[dest][alias] = it;
				}
			}
		}
	}
}
