import Command from './parser/command';
import Context from './parser/context';
import debug from './lib/debug';
import E from './lib/errors';
import Extension from './parser/extension';
import fs from 'fs-extra';
import helpCommand, { renderHelp } from './commands/help';
import Parser from './parser/parser';
import path from 'path';
import pluralize from 'pluralize';
import semver from 'semver';
import Terminal from './terminal';
import WebSocket, { Server as WebSocketServer } from 'ws';

import * as ansi from './lib/ansi';

import { declareCLIKitClass, split } from './lib/util';
import { Writable } from 'stream';

const { error, log, warn } = debug('cli-kit:cli');
const { highlight }  = debug.styles;

/**
 * Writes data to a websocket.
 */
class OutputSocket extends Writable {
	constructor(ws) {
		super();
		this.ws = ws;
	}

	write(chunk) {
		this.ws.send(chunk.replace(/(?<!\r)\n/g, '\r\n'));
	}
}

/**
 * The required Node.js version for cli-kit. This is used to assert the Node version at runtime.
 * If the `CLI` instance is created with a `nodeVersion`, then it assert the greater of the two
 * Node versions.
 *
 * @type {String}
 */
const clikitNodeVersion = fs.readJsonSync(path.resolve(__dirname, '..', 'package.json')).engines.node;

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
	 * @param {Boolean} [params.help=false] - When `true`, enables the built-in help command.
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
		this.bannerEnabled             = true;
		this.colors                    = params.colors !== false;
		this.defaultCommand            = params.defaultCommand;
		this.errorIfUnknownCommand     = params.errorIfUnknownCommand !== false;
		this.help                      = !!params.help;
		this.helpExitCode              = params.helpExitCode;
		this.helpTemplateFile          = params.helpTemplateFile;
		this.hideNoBannerOption        = params.hideNoBannerOption;
		this.hideNoColorOption         = params.hideNoColorOption;
		this.nodeVersion               = params.nodeVersion;
		this.showBannerForExternalCLIs = params.showBannerForExternalCLIs;
		this.showHelpOnError           = params.showHelpOnError;
		this.terminal                  = params.terminal || new Terminal();
		this.version                   = params.version;
		this.warnings                  = [];

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
					if (await next()) {
						let version = this.version;
						if (typeof version === 'function') {
							version = await version(opts);
						}
						(opts.terminal || this.terminal).stdout.write(`${version}\n`);
						exitCode(0);
						return false;
					}
				},
				desc: 'outputs the version'
			});
		}

		// add the extensions now that the auto-generated options exist
		if (extensions) {
			const exts = Array.isArray(extensions) ? extensions : Object.entries(extensions);
			for (const ext of exts) {
				try {
					this.extension.apply(this, Array.isArray(ext) ? [ ext[1], ext[0] ] : [ ext ]);
				} catch (e) {
					this.warnings.push(e);
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
	 * @param {Termianl} [opts.terminal] - A terminal instance to override the default CLI terminal
	 * instance.
	 * @returns {Promise<Function>} Resolves a function to send data as if from stdin.
	 * @access public
	 */
	static connect(url, opts = {}) {
		return new Promise(resolve => {
			if (!opts || typeof opts !== 'object') {
				throw new TypeError('Expected options to be an object');
			}

			let term = opts.terminal;
			delete opts.terminal;

			if (!term) {
				term = new Terminal();
			} else if (!(term instanceof Terminal)) {
				throw E.INVALID_ARGUMENT('Expected terminal to be a Terminal instance', { name: 'opts.terminal', scope: 'CLI.connect', value: term });
			}

			log(`Connecting to ${highlight(url)}`);
			const ws = new WebSocket(url, opts);
			ws.binaryType = 'arraybuffer';

			ws.on('open', () => {
				const send = chunk => {
					if (ws.readyState === 1) {
						ws.send(chunk);
					}
				};

				term.on('keypress', send);
				term.on('resize', ({ rows, columns }) => {
					send(`${ansi.esc}${rows};${columns}R`);
				});

				resolve(send);
			});

			ws.on('message', msg => {
				if (msg === ansi.cursor.get && ws.readyState === 1) {
					ws.send(`${ansi.esc}${term.rows};${term.columns}R`);
					return;
				}

				const exit = msg.match(ansi.custom.exit.re);
				if (exit) {
					process.exit(exit);
				}

				term.stdout.write(msg);
			});

			ws.on('close', () => process.exit());

			term.on('SIGINT', () => ws.close());
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
	 * @param {Boolean} [opts.serverMode=false] - When `true`, makes things such that `exec()`
	 * doesn't change any global state by deep cloning the entire context tree every time the
	 * arguments are parsed and changing the process state. Enabling this only makes sense if the
	 * `CLI` instance is going to be reused to parse arguments multiple times and if the state of
	 * thecontext tree is going to be modified during parsing (i.e. via a callback).
	 * @param {Termianl} [opts.terminal] - A terminal instance to override the default CLI terminal
	 * instance.
	 * @returns {Promise.<Arguments>}
	 * @access public
	 */
	async exec(_argv, opts = {}) {
		const { version } = process;
		let required = this.nodeVersion;
		if ((required && !semver.satisfies(version, required)) || !semver.satisfies(version, required = clikitNodeVersion)) {
			throw E.INVALID_NODE_JS(`${this.appName !== 'program' && this.appName || 'This program'} requires Node.js version ${required}, currently ${version}`, {
				name: 'nodeVersion',
				scope: 'CLI.exec',
				current: version,
				required
			});
		}

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

		let { showHelpOnError } = this;
		let exitCode = undefined;
		const parser = new Parser(opts);
		const __argv = _argv.slice(0);
		const results = {
			_:           undefined,
			_argv,       // the original unparsed arguments
			__argv,      // the parsed arguments
			argv:        undefined,
			cli:         this,
			cmd:         undefined,
			console:     opts.terminal.console,
			contexts:    undefined,
			data:        opts.data,
			exitCode:    opts.exitCode = code => code === undefined ? exitCode : (exitCode = code || 0),
			help:        () => renderHelp(results.cmd),
			result:      undefined,
			terminal:    opts.terminal,
			unknown:     undefined,
			warnings:    this.warnings
		};

		this.once('banner', ({ argv, ctx = this }) => {
			if (this.autoHideBanner) {
				opts.terminal.once('output', () => {
					let banner = ctx.prop('banner');
					if (banner && this.bannerEnabled) {
						banner = String(typeof banner === 'function' ? banner(opts) : banner).trim();
						opts.terminal.stdout.write(`${banner}\n\n`);
					}
				});
			}

			if ((argv && !argv.banner) || (ctx instanceof Extension && !ctx.isCLIKitExtension && !ctx.get('showBannerForExternalCLIs'))) {
				this.bannerEnabled = false;
			} else if (ctx.banner) {
				this.banner = ctx.banner;
			}
		});

		try {
			const { _, argv, contexts, unknown } = await parser.parse(__argv, opts.serverMode ? new Context(this) : this);

			log('Parsing complete: ' +
				`${pluralize('option', Object.keys(argv).length, true)}, ` +
				`${pluralize('unknown option', Object.keys(unknown).length, true)}, ` +
				`${pluralize('arg', _.length, true)}, ` +
				`${pluralize('context', contexts.length, true)} ` +
				`(exit: ${results.exitCode()})`
			);

			const cmd = contexts[0];

			results._        = _;
			results.argv     = argv;
			results.cmd      = cmd;
			results.contexts = contexts;
			results.unknown  = unknown;

			if (results.exitCode() === undefined) {
				// determine the command to run
				if (this.help && argv.help && (!(cmd instanceof Extension) || cmd.isCLIKitExtension)) {
					log('Selected help command');
					results.cmd = this.commands.get('help');
					contexts.unshift(results.cmd);

				} else if (!(cmd instanceof Command) && typeof this.defaultCommand === 'string') {
					log(`Selected default command: ${this.defaultCommand}`);
					results.cmd = this.commands.get(this.defaultCommand);
					if (!(results.cmd instanceof Command)) {
						throw E.DEFAULT_COMMAND_NOT_FOUND(`The default command "${this.defaultCommand}" was not found!`);
					}
					contexts.unshift(results.cmd);
				}

				// handle the banner
				await this.emit('banner', { argv, ctx: results.cmd });

				// allow command to override showHelpOnError if not set already
				showHelpOnError = results.cmd.prop('showHelpOnError');

				// execute the command
				if (results.cmd && typeof results.cmd.action === 'function') {
					log(`Executing command: ${highlight(results.cmd.name)}`);
					results.result = await results.cmd.action(results);
				} else if (results.cmd && results.cmd.action instanceof Command && typeof results.cmd.action.action === 'function') {
					log(`Executing command: ${highlight(results.cmd.action.name)} (via ${highlight(results.cmd.name)})`);
					results.result = await results.cmd.action.action(results);
				} else if (typeof this.defaultCommand  === 'function') {
					log(`Executing default command: ${highlight(this.defaultCommand.name || 'anonymous')}`);
					results.result = await this.defaultCommand(results);
				} else {
					log('No command to execute, returning parsed arguments');
				}
			}

			if (!opts.serverMode) {
				process.exitCode = results.exitCode();
			}

			return results;
		} catch (err) {
			error(err);

			await this.emit('banner');

			const help = this.help && showHelpOnError !== false && this.commands.get('help');
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
	listen(opts = {}) {
		return new Promise(resolve => {
			log('Starting WebSocketServer...');
			this.connections = {};
			this.server = new WebSocketServer(opts, () => resolve(this.server));

			this.server.on('connection', (ws, req) => {
				const { remoteAddress, remotePort } = req.socket;
				const key = remoteAddress + ':' + remotePort;
				const { headers } = req;
				const echo = headers['clikit-echo'] !== 'off';
				const stdout = new OutputSocket(ws);
				const stderr = new OutputSocket(ws);
				const terminal = new Terminal({ stdout, stderr });

				log('%s upgraded to WebSocket', highlight(key));
				log(headers);

				// TODO: get the cwd, env

				const conn = this.connections[key] = {
					buffer: '',
					cols: 0,
					rows: 0
				};

				ws.on('close', () => {
					delete this.connections[key];
					log('%s closed WebSocket', highlight(key));
				});

				ws.on('error', err => {
					delete this.connections[key];
					if (err.code !== 'ECONNRESET') {
						error(err);
					}
				});

				ws.on('message', async msg => {
					if (Buffer.isBuffer(msg)) {
						msg = msg.toString();
					}

					const pos = msg.match(ansi.cursor.position);
					if (pos) {
						conn.rows = ~~pos[1];
						conn.cols = ~~pos[2];
						log(`Terminal set to ${conn.cols} x ${conn.rows}`);
						return;
					}

					msg = msg.replace(/\r\n|\n|\r/g, '\r\n');
					conn.buffer += msg;

					if (echo) {
						ws.send(msg);
					}

					let p = conn.buffer.indexOf('\r');
					while (p !== -1) {
						const argv = split(conn.buffer.substring(0, p));
						conn.buffer = conn.buffer.substring(p + 2);

						log('Running:', argv);
						const { exitCode } = await this.exec(argv, {
							data: {
								userAgent: headers['user-agent'] || null
							},
							serverMode: true,
							terminal
						});

						ws.send(ansi.custom.exit(exitCode() || 0));

						p = conn.buffer.indexOf('\r');
					}
				});

				ws.send(ansi.cursor.save);
				ws.send(ansi.cursor.move(999, 999));
				ws.send(ansi.cursor.get);
				ws.send(ansi.cursor.restore);
			});

			this.server.on('error', error);
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
			commands:   {},
			desc:       this.desc,
			extensions: {},
			name:       this.name,
			options:    {},
			title:      this.title,
			version:    typeof this.version === 'function' ? (await this.version(opts)) : this.version
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
