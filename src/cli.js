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

import { declareCLIKitClass } from './lib/util';
import { terminal } from './index';

const { error, log, warn } = debug('cli-kit:cli');
const { highlight }  = debug.styles;

/**
 * The required Node.js version for cli-kit. This is used to assert the Node version at runtime.
 * If the `CLI` instance is created with a `nodeVersion`, then it assert the greater of the two
 * Node versions.
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
	 * @param {String|Function} [params.banner] - A banner or a function that returns the banner
	 * to be displayed before each command.
	 * @param {Boolean} [params.colors=true] - Enables colors, specifically on the help screen.
	 * @param {Boolean} [params.defaultCommand] - The default command to execute.
	 * @param {Boolean} [params.errorIfUnknownCommand=true] - When `true`, `help` is enabled, and
	 * the parser didn't find a command, but it did find an unknown argument, it will show the help
	 * screen with an unknown command error.
	 * @param {Boolean} [params.help=false] - When `true`, enables the built-in help command.
	 * @param {Number} [params.helpExitCode] - The exit code to return when the help command is
	 * finished.
	 * @param {Boolean} [params.hideNoBannerOption=false] - When `true` and a `banner` is specified,
	 * it does not add the `--no-banner` option.
	 * @param {Boolean} [params.hideNoColorOption=false] - When `true` and `colors` is enabled, it
	 * does not add the `--no-color` option.
	 * @param {String} [params.name] - The name of the program. If not set, defaults to `"program"`
	 * in the help outut and `"This application"` in the Node version assertion.
	 * @param {String} [params.nodeVersion] - The required Node.js version to run the app.
	 * @param {Object} [params.renderOpts] - Various render options to control the output stream
	 * such as the display width.
	 * @param {Boolean} [params.showBannerForExternalCLIs=false] - If `true`, shows the `CLI`
	 * banner, assuming banner is enabled, for non-cli-kit enabled CLIs.
	 * @param {Boolean} [params.showHelpOnError=true] - If an error occurs and `help` is enabled,
	 * then display the error before the help information.
	 * @param {Terminal} [params.terminal] - A custom terminal instance, otherwise uses the default
	 * global terminal instance.
	 * @param {String} [params.title='Global'] - The title for the global context.
	 * @param {String} [params.version] - The program version.
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

		super({
			args:                           params.args,
			camelCase:                      params.camelCase,
			commands:                       params.commands,
			desc:                           params.desc,
			name:                           params.name || 'program',
			options:                        params.options,
			showBannerForExternalCLIs:      params.showBannerForExternalCLIs,
			title:                          params.title || 'Global',
			treatUnknownOptionsAsArguments: params.treatUnknownOptionsAsArguments
		});

		declareCLIKitClass(this, 'CLI');

		this.appName               = params.name;
		this.banner                = params.banner;
		this.bannerEnabled         = true;
		this.colors                = params.colors !== false;
		this.errorIfUnknownCommand = params.errorIfUnknownCommand !== false;
		this.helpExitCode          = params.helpExitCode;
		this.nodeVersion           = params.nodeVersion;
		this.warnings              = [];

		if (params.terminal && !(params.terminal instanceof Terminal)) {
			throw E.INVALID_ARGUMENT('Expected terminal to be a Terminal instance', { name: 'terminal', scope: 'CLI.constructor', value: params.terminal });
		}
		this.terminal = params.terminal || terminal;

		// set the default command
		this.defaultCommand = params.defaultCommand;

		// add the built-in help
		this.help = !!params.help;
		if (this.help) {
			if (this.defaultCommand === undefined) {
				this.defaultCommand = 'help';
			}

			// note: we must clone the help command params since the object gets modified
			this.command('help', { ...helpCommand });

			this.option('-h, --help', 'displays the help screen');
		}

		// add the --no-banner flag
		if (params.banner && !params.hideNoBannerOption) {
			this.option('--no-banner', {
				desc: 'suppress the banner'
			});
		}

		// add the --no-colors flag
		if (this.colors && !params.hideNoColorOption) {
			this.option('--no-color', {
				aliases: [ '--no-colors' ],
				desc: 'disable colors'
			});
		}

		// add the --version flag
		if (params.version && !this.lookup.short.v && !this.lookup.long.version) {
			this.option('-v, --version', {
				callback: async ({ next, value }) => {
					if (await next()) {
						this.terminal.stdout.write(`${params.version}\n`);
						process.exit(0);
					}
				},
				desc: 'outputs the version'
			});
		}

		// add the extensions now that the auto-generated options exist
		if (params.extensions) {
			if (Array.isArray(params.extensions)) {
				for (const ext of params.extensions) {
					try {
						this.extension(ext);
					} catch (e) {
						this.warnings.push(e);
						warn(e);
					}
				}
			} else {
				for (const [ name, ext ] of Object.entries(params.extensions)) {
					try {
						this.extension(ext, name);
					} catch (e) {
						this.warnings.push(e);
						warn(e);
					}
				}
			}
		}
	}

	/**
	 * Parses the command line arguments and runs the command.
	 *
	 * @param {Array.<String>} [unparsedArgs] - An array of arguments to parse. If not specified, it
	 * defaults to the `process.argv` starting with the 3rd argument.
	 * @returns {Promise.<Arguments>}
	 * @access public
	 */
	async exec(unparsedArgs) {
		const { version } = process;
		let required = this.nodeVersion;
		if ((required && !semver.satisfies(version, required)) || !semver.satisfies(version, required = clikitNodeVersion)) {
			throw E.INVALID_NODE_JS(`${this.appName || 'This application'} requires Node.js version is ${required}, currently ${version}`, {
				name: 'nodeVersion',
				scope: 'CLI.exec',
				current: version,
				required
			});
		}

		if (unparsedArgs && !Array.isArray(unparsedArgs)) {
			throw E.INVALID_ARGUMENT('Expected arguments to be an array', { name: 'args', scope: 'CLI.exec', value: unparsedArgs });
		}

		const parser = new Parser();

		try {
			const { _, argv, contexts, unknown } = await parser.parse(unparsedArgs || process.argv.slice(2), this);

			log('Parsing complete: ' +
				`${pluralize('option', Object.keys(argv).length, true)}, ` +
				`${pluralize('unknown option', Object.keys(unknown).length, true)}, ` +
				`${pluralize('arg', _.length, true)}, ` +
				`${pluralize('context', contexts.length, true)}`
			);

			const results = {
				_,
				argv,
				cli:      this,
				clikit:   { ...require('./index') },
				cmd:      contexts[0],
				console:  this.terminal.console,
				contexts,
				help:     () => renderHelp(results.cmd),
				result:   undefined,
				unknown,
				warnings: this.warnings
			};

			// determine the command to run
			if (this.help && argv.help && (!(results.cmd instanceof Extension) || results.cmd.isCLIKitExtension)) {
				log('Selected help command');
				results.cmd = this.commands.get('help');
				contexts.unshift(results.cmd);

			} else if (!(results.cmd instanceof Command) && this.defaultCommand && this.commands.has(this.defaultCommand)) {
				log(`Selected default command: ${this.defaultCommand}`);
				results.cmd = this.commands.get(this.defaultCommand);
				contexts.unshift(results.cmd);
			}

			// handle the banner
			this.get('terminal').once('output', () => {
				let banner = results.cmd.prop('banner');
				if (banner && this.bannerEnabled) {
					banner = String(typeof banner === 'function' ? banner() : banner).trim();
					this.get('terminal').stdout.write(`${banner}\n\n`);
				}
			});
			if (!argv.banner || (results.cmd instanceof Extension && !results.cmd.isCLIKitExtension && !results.cmd.get('showBannerForExternalCLIs'))) {
				this.bannerEnabled = false;
			} else if (results.cmd.banner) {
				this.banner = results.cmd.banner;
			}

			// execute the command
			if (results.cmd && typeof results.cmd.action === 'function') {
				log(`Executing command: ${highlight(results.cmd.name)}`);
				results.result = await results.cmd.action(results);
			} else {
				log('No command to execute, returning parsed arguments');
			}

			return results;
		} catch (err) {
			error(err);

			const help = this.help && this.showHelpOnError !== false && this.commands.get('help');
			if (help) {
				return await help.action({
					contexts: err.contexts || parser.contexts || [ this ],
					err,
					warnings: this.warnings
				});
			}

			throw err;
		}
	}
}
