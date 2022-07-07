import Command from './parser/command.js';
import Context from './parser/context.js';
import debug from './lib/debug.js';
import E from './lib/errors.js';
import Extension from './parser/extension.js';
import helpCommand, { renderHelp } from './commands/help.js';
import Parser from './parser/parser.js';
import pluralize from 'pluralize';
import Terminal from './terminal.js';

import { assertNodeJSVersion, declareCLIKitClass } from './lib/util.js';

const { error, log, warn } = debug('cli-kit:cli');
const { highlight, note }  = debug.styles;
const { chalk } = debug;
const defaultStyles = {
	bold: chalk.bold,
	dim: chalk.dim,
	italic: chalk.italic,
	underline: chalk.underline,
	inverse: chalk.inverse,
	hidden: chalk.hidden,
	strikethrough: chalk.strikethrough,

	black: chalk.black,
	red: chalk.red,
	green: chalk.green,
	yellow: chalk.yellow,
	blue: chalk.blue,
	magenta: chalk.magenta,
	cyan: chalk.cyan,
	white: chalk.white,
	gray: chalk.gray,

	bgBlack: chalk.bgBlack,
	bgRed: chalk.bgRed,
	bgGreen: chalk.bgGreen,
	bgYellow: chalk.bgYellow,
	bgBlue: chalk.bgBlue,
	bgMagenta: chalk.bgMagenta,
	bgCyan: chalk.bgCyan,
	bgWhite: chalk.bgWhite,

	uppercase: s => String(s).toUpperCase(),
	lowercase: s => String(s).toLowerCase(),
	bracket: s => `[${s}]`,
	paren: s => `(${s})`,

	highlight: chalk.cyan,
	lowlight: chalk.blue,
	ok: chalk.green,
	notice: chalk.yellow,
	alert: chalk.red,
	note: chalk.gray,
	warn: chalk.yellow,
	error: chalk.red,
	heading: s => String(s).toUpperCase(),
	subheading: chalk.gray
};

/**
 * Defines a CLI context and is responsible for parsing the command line arguments.
 *
 * @extends {Context}
 */
export default class CLI extends Context {
	/**
	 * Created a CLI instance.
	 *
	 * @param {Object} [params] - Various options.
	 * @param {Boolean} [params.autoHideBanner=true] - When `true` and a `banner` is set, it will
	 * detect if the first characters written to `stdout` or `stderr` match a JSON object/array or
	 * XML document, then suppresses the banner.
	 * @param {String|Function} [params.banner] - A banner or a function that returns the banner
	 * to be displayed before each command.
	 * @param {Boolean} [params.colors=true] - Enables colors, specifically on the help screen.
	 * @param {String|Function} [params.defaultCommand="help"] - The default command to execute.
	 * When value is a `String`, it looks up the command and calls it. If value is a `Function`, it
	 * simply invokes it.
	 * @param {Boolean} [params.errorIfUnknownCommand=true] - When `true`, `help` is enabled, and
	 * the parser didn't find a command, but it did find an unknown argument, it will show the help
	 * screen with an unknown command error.
	 * @param {String|Function|Object} [params.help] - Additional help content to display on the
	 * help screen. When may be an object with the properties `header` and `footer` which values
	 * that are either a string or an async function that resolves a string. When value is a string
	 * or function, it is trasnformed into a object with the value being used as the header. Note
	 * that the command description is not displayed when a header message has been defined.
	 * @param {Number} [params.helpExitCode] - The exit code to return when the help command is
	 * finished.
	 * @param {String} [params.helpTemplateFile] - Path to a template to render for the help
	 * command.
	 * @param {Boolean} [params.hideNoBannerOption] - When `true` and a `banner` is specified, it
	 * does not add the `--no-banner` option.
	 * @param {Boolean} [params.hideNoColorOption] - When `true` and `colors` is enabled, it does
	 * not add the `--no-color` option.
	 * @param {String} [params.name] - The name of the program. If not set, defaults to `"program"`
	 * in the help outut and `"This application"` in the Node version assertion.
	 * @param {String} [params.nodeVersion] - The required Node.js version to run the app.
	 * @param {Boolean} [params.showBannerForExternalCLIs=false] - If `true`, shows the `CLI`
	 * banner, assuming banner is enabled, for non-cli-kit enabled CLIs.
	 * @param {Boolean} [params.showHelpOnError=true] - If an error occurs and `help` is enabled,
	 * then display the error before the help information.
	 * @param {Object} [params.styles] - Custom defined style functions.
	 * @param {Terminal} [params.terminal] - A custom terminal instance, otherwise uses the default
	 * global terminal instance.
	 * @param {String} [params.title='Global'] - The title for the global context.
	 * @param {String|Function} [params.version] - The program version or a function that resolves
	 * a version.
	 * @access public
	 */
	constructor(params = {}) {
		if (!params || typeof params !== 'object' || Array.isArray(params)) {
			throw E.INVALID_ARGUMENT('Expected CLI parameters to be an object or Context', { name: 'params', scope: 'CLI.constructor', value: params });
		}

		if (params.banner !== undefined && typeof params.banner !== 'string' && typeof params.banner !== 'function') {
			throw E.INVALID_ARGUMENT('Expected banner to be a string or function', { name: 'banner', scope: 'CLI.constructor', value: params.banner });
		}

		if (params.extensions && typeof params.extensions !== 'object') {
			throw E.INVALID_ARGUMENT(
				'Expected extensions to be an array of extension paths or an object of names to extension paths',
				{ name: 'extensions', scope: 'CLI.constructor', value: params.extensions }
			);
		}

		if (params.helpExitCode !== undefined && typeof params.helpExitCode !== 'number') {
			throw E.INVALID_ARGUMENT('Expected help exit code to be a number', { name: 'helpExitCode', scope: 'CLI.constructor', value: params.helpExitCode });
		}

		if (params.terminal && !(params.terminal instanceof Terminal)) {
			throw E.INVALID_ARGUMENT('Expected terminal to be a Terminal instance', { name: 'terminal', scope: 'CLI.constructor', value: params.terminal });
		}

		if (params.defaultCommand !== undefined && (!params.defaultCommand || (typeof params.defaultCommand !== 'string' && typeof params.defaultCommand !== 'function'))) {
			throw E.INVALID_ARGUMENT('Expected default command to be a string or function', { name: 'defaultCommand', scope: 'CLI.constructor', value: params.defaultCommand });
		}

		// make sure we have a `name` and `title` for the context
		if (!params.name) {
			params.name = 'program';
		}
		if (!params.title) {
			params.title = 'Global';
		}

		// extract the extensions... we initialize them ourselves
		const { extensions } = params;
		delete params.extensions;

		super(params);
		declareCLIKitClass(this, 'CLI');

		this.appName                   = params.appName || params.name;
		this.autoHideBanner            = params.autoHideBanner !== false;
		this.colors                    = params.colors !== false;
		this.defaultCommand            = params.defaultCommand;
		this.errorIfUnknownCommand     = params.errorIfUnknownCommand !== false;
		this.help                      = params.help;
		this.helpExitCode              = params.helpExitCode;
		this.helpTemplateFile          = params.helpTemplateFile;
		this.hideNoBannerOption        = params.hideNoBannerOption;
		this.hideNoColorOption         = params.hideNoColorOption;
		this.nodeVersion               = params.nodeVersion;
		this.showBannerForExternalCLIs = params.showBannerForExternalCLIs;
		this.showHelpOnError           = params.showHelpOnError;
		this.styles                    = Object.assign({}, defaultStyles, params.styles);
		this.terminal                  = params.terminal || new Terminal();
		this.version                   = params.version;
		this.warnings                  = [];

		this.terminal.on('SIGINT', () => process.kill(process.pid, 'SIGINT'));

		// add the built-in help
		if (this.help) {
			if (this.defaultCommand === undefined) {
				this.defaultCommand = 'help';
			}

			// note: we must clone the help command params since the object gets modified
			this.command('help', { ...helpCommand });

			this.option('-h, --help', 'Displays the help screen');
		}

		// add the --no-banner flag
		if (this.banner && !this.hideNoBannerOption) {
			this.option('--no-banner', 'Suppress the banner');
		}

		// add the --no-colors flag
		if (this.colors && !this.hideNoColorOption) {
			this.option('--no-color', {
				aliases: [ '--no-colors' ],
				desc: 'Disable colors'
			});
		}

		// add the --version flag
		if (this.version && !this.lookup.short.v && !this.lookup.long.version) {
			this.option('-v, --version', {
				callback: async ({ exitCode, opts, next }) => {
					if (await next() === true) {
						let version = this.version;
						if (typeof version === 'function') {
							version = await version(opts);
						}
						(opts.terminal || this.terminal).stdout.write(`${version}\n`);
						exitCode(0);
						return false;
					}
				},
				desc: 'Outputs the version'
			});
		}

		// add the extensions now that the auto-generated options exist
		if (extensions) {
			const exts = Array.isArray(extensions) ? extensions : Object.entries(extensions);
			for (const ext of exts) {
				try {
					this.extension.apply(this, Array.isArray(ext) ? [ ext[1], ext[0] ] : [ ext ]);
				} catch (e) {
					this.warnings.push(`Error loading extension "${ext}"`);
					warn(e);
				}
			}
		}
	}

	/**
	 * Parses the command line arguments and runs the command.
	 *
	 * @param {Array.<String>} [_argv] - An array of arguments to parse. If not specified, it
	 * defaults to the `process.argv` starting with the 3rd argument.
	 * @param {Object} [opts] - Various options.
	 * @param {Object} [opts.data] - User-defined data to pass into the selected command.
	 * @param {Function} [opts.exitCode] - A function that sets the exit code.
	 * @param {Array.<String>} [params.parentContextNames] - An array of parent context names.
	 * @param {Boolean} [opts.remoteHelp=false] - When `true`, don't execute the built-in help
	 * command. This is set when a request comes from a remote connection.
	 * @param {Termianl} [opts.terminal] - A terminal instance to override the default CLI terminal
	 * instance.
	 * @returns {Promise.<Arguments>}
	 * @access public
	 */
	async exec(_argv, opts = {}) {
		assertNodeJSVersion(this);

		if (!_argv) {
			_argv = process.argv.slice(2);
		} else if (!Array.isArray(_argv)) {
			throw E.INVALID_ARGUMENT('Expected arguments to be an array', { name: 'args', scope: 'CLI.exec', value: _argv });
		}

		if (!opts || typeof opts !== 'object') {
			throw E.INVALID_ARGUMENT('Expected opts to be an object', { name: 'opts', scope: 'CLI.exec', value: opts });
		}

		if (!opts.data) {
			opts.data = {};
		} else if (typeof opts.data !== 'object') {
			throw E.INVALID_ARGUMENT('Expected data to be an object', { name: 'opts.data', scope: 'CLI.exec', value: opts.data });
		}

		if (!opts.terminal) {
			opts.terminal = this.terminal;
		} else if (!(opts.terminal instanceof Terminal)) {
			throw E.INVALID_ARGUMENT('Expected terminal to be a Terminal instance', { name: 'opts.terminal', scope: 'CLI.exec', value: opts.terminal });
		}

		let exitCode = undefined;
		let showHelpOnError = this.prop('showHelpOnError');
		const parser = new Parser(opts).link(this);
		const __argv = _argv.slice(0);

		opts.exitCode = code => code === undefined ? exitCode : (exitCode = code || 0);
		opts.styles = Object.assign({}, this.styles, opts.styles);

		let results = {
			_:              undefined,
			_argv,          // the original unparsed arguments
			__argv,         // the parsed arguments
			argv:           undefined,
			bannerFired:    false,
			bannerRendered: false,
			cli:            this,
			cmd:            undefined,
			console:        opts.terminal.console,
			contexts:       undefined,
			data:           opts.data,
			exitCode:       opts.exitCode,
			help:           () => renderHelp(results.cmd, opts),
			result:         undefined,
			setExitCode:    opts.exitCode,
			styles:         opts.styles,
			terminal:       opts.terminal,
			unknown:        undefined,
			warnings:       this.warnings
		};

		const renderBanner = async (state) => {
			const { argv, cli, cmd = cli, terminal } = state;

			// if --no-banner, then return
			// or if we're running an extension that is not a cli-kit extension, then return and
			// let the extension CLI render its own banner
			if (state.bannerRendered || (argv && !argv.banner) || (cmd instanceof Extension && !cmd.isCLIKitExtension && !cmd.get('showBannerForExternalCLIs'))) {
				return;
			}

			state.bannerRendered = true;

			// copy the banner to the state
			// if the banner is a function, run it now
			if (cmd.banner !== undefined) {
				state.banner = cmd.banner;
				cmd._origBanner = cmd.banner;
				Object.defineProperty(cmd, 'banner', {
					get() {
						return cmd._origBanner;
					},
					set(value) {
						state.banner = value;
					}
				});
			}

			for (let p = cmd.parent; p; p = p.parent) {
				if (state.banner === undefined && (!(state.bannerFired instanceof Error) || p.banner !== undefined)) {
					state.banner = p.banner;
				}

				p._origBanner = p.banner;
				Object.defineProperty(p, 'banner', {
					get() {
						return p._origBanner;
					},
					set(value) {
						state.banner = value;
					}
				});
			}

			if (typeof state.banner === 'function') {
				state.banner = await state.banner(state);
			}

			const printBanner = () => {
				if (typeof state.banner === 'function') {
					throw new Error('Banner function not supported here');
				}
				if (state.banner) {
					state.banner = String(state.banner).trim();
				}
				if (state.banner) {
					terminal.stdout.write(`${state.banner}\n\n`);
				}
			};

			if (cmd.prop('autoHideBanner')) {
				// wait to show banner
				terminal.onOutput(() => printBanner());
			} else {
				// show banner now
				printBanner();
			}
		};

		const bannerHook = async state => {
			if (!state.bannerFired) {
				state.bannerFired = true;
				try {
					await this.hook('banner', renderBanner)(state);
				} catch (err) {
					state.bannerFired = err;
					throw err;
				}
			}
		};

		try {
			const cli = this;

			log(`Parsing ${__argv.length} argument${__argv.length !== 1 ? 's' : ''}`);

			// parse the command line arguments
			const {
				_,
				argv,
				contexts,
				required,
				unknown
			} = await parser.parse({
				args: __argv,
				ctx:  cli,
				data: results.data
			});

			log('Parsing complete: ' +
				`${pluralize('option', Object.keys(argv).length, true)}, ` +
				`${pluralize('unknown option', Object.keys(unknown).length, true)}, ` +
				`${pluralize('arg', _.length, true)}, ` +
				`${pluralize('context', contexts.length, true)} ` +
				note(`(exit: ${results.exitCode()})`)
			);

			const cmd = contexts[0];

			// check for missing arguments and options if help is disabled or is not set
			if (!this.help || !argv.help) {
				// `_` already contains all known parsed arguments, but may not contain all required
				// arguments, thus we must loop over the remaining arguments and check if there are
				// any missing required arguments.
				//
				// note that we stop looping if we find an argument with multiple arguments since
				// we've already gobbled up all the values
				let i = _.length;
				const len = cmd.args.length;
				if (i === 0 || (i < len && !cmd.args[i - 1].multiple)) {
					for (; i < len; i++) {
						if (cmd.args[i].required && (!cmd.args[i].multiple || !argv[cmd.args[i].name].length)) {
							throw E.MISSING_REQUIRED_ARGUMENT(
								`Missing required argument "${cmd.args[i].name}"`,
								{ name: 'args', scope: 'Parser.parse', value: cmd.args[i] }
							);
						}
					}
				}

				if (required.size) {
					throw E.MISSING_REQUIRED_OPTION(
						`Missing ${required.size} required option${required.size === 1 ? '' : 's'}:`,
						{ name: 'options', scope: 'Parser.parse', required: required.values() }
					);
				}
			}

			results._                  = _;
			results.argv               = argv;
			results.cmd                = cmd;
			results.cli                = cli;
			results.contexts           = contexts;
			results.parentContextNames = opts.parentContextNames;
			results.unknown            = unknown;

			// check if we haven't already errored
			if (results.exitCode() === undefined) {
				// determine the command to run
				if (this.help && argv.help && (!cmd.isExtension || cmd.isCLIKitExtension)) {
					// disable the built-in help if the help is to be rendered remotely
					// note: the current `cmd` could be a command under an extension, so we call
					// `cmd.prop()` to scan the command's parents to see if this command is
					// actually remote
					if (!cmd.prop('remoteHelp')) {
						log(`Selected help command, was "${cmd.name}"`);
						results.cmd = this.commands.get('help');
						contexts.unshift(results.cmd);
					}

				} else if (typeof this.defaultCommand === 'string' &&
					(
						// if we don't have an action or command, then do the default command
						!(cmd instanceof Command) ||

						// if we have a command, but the command does not have an action, then do
						// the default command
						(typeof cmd.action !== 'function' &&
							(!(cmd.action instanceof Command) || typeof cmd.action.action !== 'function')
						)
					) &&
					(!cmd.prop('remoteHelp') || this.defaultCommand !== 'help')
				) {
					log(`Selected default command: ${highlight(this.defaultCommand)}`);
					results.cmd = this.commands.get(this.defaultCommand);
					if (!(results.cmd instanceof Command)) {
						throw E.DEFAULT_COMMAND_NOT_FOUND(`The default command "${this.defaultCommand}" was not found!`);
					}
					contexts.unshift(results.cmd);
				}

				// now that we've made it past the parsing and validation, we are going to execute
				// the command and thus we want to turn off show help on error unless the error
				// explicitly requests help to be shown
				showHelpOnError = false;

				// handle the banner
				await bannerHook(results);

				results = await this.hook('exec', async results => {
					// execute the command
					if (results.cmd && typeof results.cmd.action === 'function') {
						log(`Executing command: ${highlight(results.cmd.name)}`);
						results.result = await results.cmd.action.call(results.cmd, results);
					} else if (results.cmd && results.cmd.action instanceof Command && typeof results.cmd.action.action === 'function') {
						// I think this is related to the legacy extension stuff...
						log(`Executing command: ${highlight(results.cmd.action.name)} (via ${highlight(results.cmd.name)})`);
						results.result = await results.cmd.action.action.call(results.cmd.action, results);
					} else if (typeof this.defaultCommand  === 'function') {
						log(`Executing default command: ${highlight(this.defaultCommand.name || 'anonymous')}`);
						results.result = await this.defaultCommand.call(this.defaultCommand, results);
					} else {
						log('No command to execute, returning parsed arguments');
					}
					return results;
				})(results);
			}

			process.exitCode = results.exitCode();

			return results;
		} catch (err) {
			error(err.stack || err.message || err.toString() || 'Unknown error');

			if (err.json === undefined && results.cmd?.prop('jsonMode')) {
				err.json = true;
			} else {
				// the banner rendered during an error does not fire the hook
				await renderBanner(results);
			}

			const help = this.help && (showHelpOnError !== false || err.showHelp) && this.commands.get('help');
			if (help) {
				results.contexts = err.contexts || parser.contexts || [ this ];
				results.err = err;
				results.result = await help.action(results);
				process.exitCode = results.exitCode();
				return results;
			}

			throw err;
		}
	}
}
