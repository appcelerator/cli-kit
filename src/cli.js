import Command from './parser/command';
import Context from './parser/context';
import debug from './lib/debug';
import E from './lib/errors';
import Extension from './parser/extension';
import helpCommand, { renderHelp } from './commands/help';
import Parser from './parser/parser';
import pluralize from 'pluralize';
import Terminal from './terminal';
import WebSocket, { Server as WebSocketServer } from 'ws';

import * as ansi from './lib/ansi';

import { declareCLIKitClass, decode, split, assertNodeJSVersion } from './lib/util';
import { EventEmitter } from 'events';
import { generateKey } from './lib/keys';
import { WriteStream } from 'tty';

const { error, log, warn } = debug('cli-kit:cli');
const { highlight, note }  = debug.styles;

/**
 * Writes data to a websocket.
 */
class OutputSocket extends WriteStream {
	constructor(fd, ws) {
		super(fd);
		this.ws = ws;
	}

	write(chunk) {
		this.ws.send(chunk.replace(/(?<!\r)\n/g, '\r\n'));
	}
}

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
	 * @param {Boolean} [opts.serverMode=false] - When `true`, makes things such that `exec()`
	 * doesn't change any global state by deep cloning the entire context tree every time the
	 * arguments are parsed and changing the process state. Enabling this only makes sense if the
	 * `CLI` instance is going to be reused to parse arguments multiple times and if the state of
	 * the context tree is going to be modified during parsing (i.e. via a callback). It also
	 * prevents ctrl-c (SIGINT) and does not set an exit code.
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
		this.serverMode                = params.serverMode;
		this.showBannerForExternalCLIs = params.showBannerForExternalCLIs;
		this.showHelpOnError           = params.showHelpOnError;
		this.styles                    = Object.assign({}, debug.styles, params.styles);
		this.terminal                  = params.terminal || new Terminal();
		this.version                   = params.version;
		this.warnings                  = [];

		// if we're not in server mode, wire up the SIGINT handler
		if (!this.serverMode) {
			this.terminal.on('SIGINT', () => process.kill(process.pid, 'SIGINT'));
		}

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
	 * Connects to a cli-kit WebSocket server and initializes a terminal session.
	 *
	 * @param {String} url - The URL to connect to.
	 * @param {Object} [opts] - Various options.
	 * @param {Object} [opts.headers] - HTTP headers to send when creating the WebSocket.
	 * @param {Termianl} [opts.terminal] - A terminal instance to override the default CLI terminal
	 * instance.
	 * @param {Number} [opts.timeout=5000] - The number of milliseconds to wait to connect to the
	 * server and complete the initialization handshake.
	 * @returns {Promise<Object>} Resolves an `EventEmitter` based handle containing a `send()`
	 * function to send data as if from `stdin`.
	 * @access public
	 */
	static async connect(url, opts = {}) {
		if (!url || typeof url !== 'string') {
			throw E.INVALID_ARGUMENT('Expected URL to be a string', { name: 'url', scope: 'CLI.connect', value: url });
		}

		if (!opts || typeof opts !== 'object') {
			throw E.INVALID_ARGUMENT('Expected options to be an object', { name: 'opts', scope: 'CLI.connect', value: opts });
		}

		let term = opts.terminal;
		delete opts.terminal;

		if (!term) {
			term = new Terminal();
		} else if (!(term instanceof Terminal)) {
			throw E.INVALID_ARGUMENT('Expected terminal to be a Terminal instance', { name: 'opts.terminal', scope: 'CLI.connect', value: term });
		}

		return await new Promise((resolve, reject) => {
			log(`Connecting to ${highlight(url)}`);
			const ws = new WebSocket(url, opts);
			ws.binaryType = 'arraybuffer';

			const handle = new EventEmitter();
			handle.send = chunk => {
				if (ws.readyState === 1) {
					ws.send(chunk);
				}
			};

			const initTimer = setTimeout(() => {
				const err = new Error(ws.readyState === 1 ? 'Failed to initialize terminal session' : 'Failed to connect to server');
				err.code = 'ETIMEOUT';
				reject(err);
			}, opts.timeout || 5000);

			ws.on('close', (code, reason) => handle.emit('close', code, reason));

			ws.on('error', err => handle.emit('error', err));

			ws.on('message', msg => {
				if (msg === ansi.cursor.get && ws.readyState === 1) {
					clearTimeout(initTimer);
					ws.send(`${ansi.esc}${term.rows};${term.columns}R`);
					resolve(handle);
					return;
				}

				const code = msg.match(ansi.custom.exit.re);
				if (code) {
					handle.emit('exit', code[1]);
					return;
				}

				term.stdout.write(msg);
			});

			term.on('keypress', (chunk, key) => {
				// console.log('KEYPRESS', chunk === undefined ? chunk : Buffer.from(chunk), key, Buffer.from(key.sequence));
				handle.send(ansi.custom.keypress(key));
			});

			term.on('resize', ({ rows, columns }) => {
				handle.send(`${ansi.esc}${rows};${columns}R`);
			});

			term.on('SIGINT', () => {
				ws.close();
				process.exit();
			});
		});
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
			const cli = this.serverMode ? new Context().init(this, true) : this;

			log(`Parsing ${__argv.length} argument${__argv.length !== 1 ? 's' : ''} ${note(`(server mode: ${!!this.serverMode})`)}`);

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

			if (!this.serverMode) {
				process.exitCode = results.exitCode();
			}

			return results;
		} catch (err) {
			if (!this.serverMode) {
				error(err.stack || err.message || err.toString() || 'Unknown error');
			}

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

	/**
	 * Starts a WebSocket server.
	 *
	 * @param {Object} [opts] - WebSocket server options. Visit
	 * https://github.com/websockets/ws/blob/HEAD/doc/ws.md#new-websocketserveroptions-callback for
	 * more information.
	 * @returns {Promise<WebSocketServer>}
	 * @access public
	 */
	async listen(opts = {}) {
		if (!opts || typeof opts !== 'object') {
			throw E.INVALID_ARGUMENT('Expected options to be an object', { name: 'opts', scope: 'CLI.listen', value: opts });
		}

		if (opts.port !== undefined && (typeof opts.port !== 'number' || opts.port < 1 || opts.port > 65535)) {
			throw E.INVALID_ARGUMENT('Expected port to be a number between 1 and 65535', { name: 'opts.port', scope: 'CLI.listen', value: opts.port });
		}

		log(`Starting WebSocketServer${opts.port ? ` on port ${highlight(opts.port)}` : ''}...`);

		if (!this.serverMode) {
			log('Enabling server mode');
			this.serverMode = true;
		}

		return new Promise((resolve, reject) => {
			this.server = new WebSocketServer(opts, () => resolve(this.server));

			this.server.on('connection', (ws, req) => {
				const { remoteAddress, remotePort } = req.socket;
				const key = remoteAddress + ':' + remotePort;

				try {
					const { headers } = req;
					const terminal = new Terminal({
						stdout: new OutputSocket(1, ws),
						stderr: new OutputSocket(2, ws)
					});
					let buffer = '';
					let current = null;
					let echo = false;

					log(`${highlight(key)} upgraded to WebSocket`);
					log(headers);

					ws.on('close', () => log(`${highlight(key)} closed WebSocket`));

					ws.on('error', err => {
						if (err.code !== 'ECONNRESET') {
							error(err);
						}
					});

					const exec = async (args, post) => {
						const command = split(args);
						log(`Running: ${highlight(command)}`);

						current = this.exec(command, {
							data: {
								cwd:       decode(headers['clikit-cwd']),
								env:       decode(headers['clikit-env']),
								userAgent: headers['user-agent'] || undefined
							},
							parentContextNames: decode(headers['clikit-parents']),
							terminal
						});

						if (typeof post === 'function') {
							post();
						}

						let ec = 1;

						try {
							const { exitCode } = await current;
							ec = exitCode() || 0;
						} catch (err) {
							error(err.stack || err.message || err.toString());
							terminal.stderr.write(`${this.styles.error(err.toString())}\n`);
						} finally {
							current = null;
							log(`Command finished (code ${ec})`);
							ws.send(ansi.custom.exit(ec));
						}
					};

					ws.on('message', async msg => {
						if (Buffer.isBuffer(msg)) {
							msg = msg.toString();
						}

						let m;

						try {
							// check if we received a cursor message
							m = msg.match(ansi.cursor.position);
							if (m) {
								const rows = terminal.stdout.rows = terminal.stderr.rows = ~~m[1];
								const cols = terminal.stdout.columns = terminal.stderr.columns = ~~m[2];
								log(`Terminal set to ${highlight(cols)} x ${highlight(rows)}`);
								return;
							}

							// check if we received an echo message
							m = msg.match(ansi.custom.echo.re);
							if (m) {
								echo = m[1] !== 'off';
								log(`Setting echo ${highlight(echo ? 'on' : 'off')}`);
								return;
							}

							// check if we received an execute message
							m = msg.match(ansi.custom.exec.re);
							if (m) {
								return await exec(decode(m[1]));
							}

							// check if we received a keypress message
							m = msg.match(ansi.custom.keypress.re);
							if (m) {
								const key = decode(m[1]);

								if (current) {
									terminal.stdin.emit('keypress', key.sequence, key);
									return;
								}

								msg = key.sequence;
								m = null;
							}

							// message is a raw message, so we have to clean it up, buffer, and manually dispatch

							msg = msg.replace(/\r\n|\n|\r/g, '\r\n'); // normalize new lines
							msg = msg.replace(/\x7f/g, '\b'); // normalize backspaces

							// TODO: support cursor position

							// repeat back to the client what they just passed us
							if (echo) {
								ws.send(msg.replace(/[\b]/g, '\b \b'));
							}

							// if there's already an active command, treat message as an incoming key from stdin
							if (current) {
								terminal.stdin.emit('keypress', msg, generateKey(msg));
								return;
							}

							// no pending command, so we need to buffer and as soon as we see a line return,
							// then we execute it and any remaining characters are treated as keypresses

							buffer += msg;

							// replace backspaces
							for (let p = 0; (p = buffer.indexOf('\b', p)) !== -1;) {
								buffer = buffer.substring(0, p - 1) + buffer.substring(p + 1);
							}

							let p = buffer.indexOf('\r');
							if (p !== -1) {
								const command = buffer.substring(0, p);
								const str = buffer.substring(p + 2);
								buffer = '';
								await exec(command, () => {
									if (str.length) {
										try {
											terminal.stdin.write(str);
										} catch (err) {
											warn('Failed to write to stdin');
											warn(err);
										}
									}
								});
							}
						} finally {
							if (m) {
								buffer = '';
							}
						}
					});

					// get the remote terminal size
					ws.send(ansi.cursor.save);
					ws.send(ansi.cursor.move(999, 999));
					ws.send(ansi.cursor.get);
					ws.send(ansi.cursor.restore);
				} catch (err) {
					warn(err);
					warn(`Hanging up ${highlight(key)}`);
				}
			});

			this.server.on('error', reject);
		});
	}

	/**
	 * Returns the schema for the CLI and all child contexts.
	 *
	 * @param {Object} [opts] - Various options.
	 * @param {Object} [opts.data] - User-defined data to pass into the selected command.
	 * @returns {Object}
	 * @access public
	 */
	async schema(opts = {}) {
		const obj = {
			args:       [],
			banner:     String(typeof this.banner === 'function' ? (await this.banner(opts)) : this.banner).trim(),
			commands:   {},
			desc:       this.desc,
			extensions: {},
			name:       this.name,
			options:    {},
			title:      this.title,
			version:    String(typeof this.version === 'function' ? (await this.version(opts)) : this.version).trim()
		};

		for (const arg of this.args) {
			if (!arg.hidden) {
				obj.args.push(arg.schema);
			}
		}

		for (const [ name, cmd ] of this.commands.entries()) {
			obj.commands[name] = await cmd.schema(opts);
		}

		for (const [ name, ext ] of this.extensions.entries()) {
			obj.extensions[name] = await ext.schema(opts);
		}

		for (const options of this.options.values()) {
			for (const opt of options) {
				if (!opt.hidden) {
					obj.options[opt.format] = await opt.schema(opts);
				}
			}
		}

		return obj;
	}
}
