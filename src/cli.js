import Parser from './parser';
import Command from './command';
import Context from './context';
import debug from './debug';
import E from './errors';
import helpCommand from './help';

import { declareCLIKitClass, WriteInterceptor } from './util';

const { error, log } = debug('cli-kit:cli');

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
	 * @param {Boolean} [params.help=false] - When `true`, enables the built-in help command.
	 * @param {Function} [params.helpRenderer] - A custom function that takes the help object and
	 * render it to a custom output.
	 * @param {Number} [params.helpExitCode] - The exit code to return when the help command is
	 * finished.
	 * @param {String} [params.name] - The name of the program.
	 * @param {Boolean} [params.hideNoBannerOption=false] - When `true` and a `banner` is specified, it
	 * does not add the `--no-banner` option.
	 * @param {Boolean} [params.hideNoColorOption=false] - When `true` and `colors` is enabled, it does
	 * not add the `--no-color` option.
	 * @param {Object|Writable} [params.out=process.stdout] - A stream to write output such as the
	 * help screen or an object with a `write()` method.
	 * @param {Boolean} [params.showHelpOnError=true] - If an error occurs and `help` is enabled,
	 * then display the error before the help information.
	 * @param {String} [params.title='Global'] - The title for the global context.
	 * @param {String} [params.version] - The program version.
	 * @param {Number} [params.width] - The number of characters to wrap long descriptions. Defaults
	 * to `process.stdout.columns` if exists, otherwise `100`. Must be at least `40`.
	 * @access public
	 */
	constructor(params = {}) {
		if (typeof params !== 'object' || Array.isArray(params)) {
			throw E.INVALID_ARGUMENT('Expected CLI parameters to be an object or Context', { name: 'params', scope: 'CLI.constructor', value: params });
		}

		if (params.out && (typeof params.out !== 'object' || typeof params.out.write !== 'function')) {
			throw E.INVALID_ARGUMENT('Expected output stream to be a writable stream', { name: 'params.out', scope: 'CLI.constructor', value: params.out });
		}

		if (params.helpExitCode !== undefined && typeof params.helpExitCode !== 'number') {
			throw E.INVALID_ARGUMENT('Expected help exit code to be a number', { name: 'params.helpExitCode', scope: 'CLI.constructor', value: params.helpExitCode });
		}

		if (params.helpRenderer !== undefined && typeof params.helpRenderer !== 'function') {
			throw E.INVALID_ARGUMENT('Expected help renderer to be a function', { name: 'params.helpRenderer', scope: 'CLI.constructor', value: params.helpRenderer });
		}

		if (params.width !== undefined && typeof params.width !== 'number') {
			throw E.INVALID_ARGUMENT('Expected width to be a number', { name: 'params.width', scope: 'CLI.constructor', value: params.width });
		}

		if (params.banner !== undefined && typeof params.banner !== 'string' && typeof params.banner !== 'function') {
			throw E.INVALID_ARGUMENT('Expected banner to be a string or function', { name: 'params.banner', scope: 'CLI.constructor', value: params.banner });
		}

		params.colors = params.colors !== false;
		params.name || (params.name = 'program');
		params.title || (params.title = 'Global');

		// extract params that we don't want mixed in
		const { extensions, hideNoBannerOption, hideNoColorOption } = params;
		delete params.extensions;
		delete params.hideNoBannerOption;
		delete params.hideNoColorOption;

		super(params);
		declareCLIKitClass(this, 'CLI');

		// set the default command
		this.defaultCommand = params.defaultCommand;

		// add the built-in help
		this.help = !!params.help;
		if (this.help) {
			if (this.defaultCommand === undefined) {
				this.defaultCommand = 'help';
			}

			// note: we must clone the help command params since the object gets modified
			this.command('help', Object.assign({}, helpCommand));

			this.option('-h, --help', 'displays the help screen');
		}

		// add the --no-banner flag
		if (this.banner && !hideNoBannerOption) {
			this.showBanner = true;

			this.option('--no-banner', {
				callback: value => {
					this.showBanner = value;
				},
				desc: 'suppress the banner'
			});
		}

		// add the --no-colors flag
		if (this.colors && !hideNoColorOption) {
			this.option('--no-color', {
				aliases: [ '--no-colors' ],
				desc: 'disable colors'
			});
		}

		// add the --version flag
		if (params.version && !this.lookup.short.v && !this.lookup.long.version) {
			this.option('-v, --version', {
				callback: async ({ next }) => {
					await next();
					this.showBanner = false;
					const out = this.get('out', process.stdout);
					out.write(`${params.version}\n`);
					process.exit(0);
				},
				desc: 'outputs the version'
			});
		}

		// add the extensions now that the auto-generated options exist
		if (Array.isArray(extensions)) {
			for (const extensionPath of extensions) {
				this.extension(extensionPath);
			}
		} else if (typeof extensions === 'object') {
			for (const name of Object.keys(extensions)) {
				this.extension(extensions[name], name);
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
		if (unparsedArgs && !Array.isArray(unparsedArgs)) {
			throw E.INVALID_ARGUMENT('Expected arguments to be an array', { name: 'args', scope: 'CLI.exec', value: unparsedArgs });
		}

		let interceptor;
		let banner = this.get('banner');
		banner = banner && String(typeof banner === 'function' ? await banner() : banner).trim();

		// if we have a banner, then override write() so we can immediately write the banner
		if (banner) {
			interceptor = new WriteInterceptor(
				[ this.get('out'), process.stdout, process.stderr ],
				() => this.get('showBanner', true) && banner
			);
		}

		const parser = new Parser();

		try {
			const { argv, _, contexts } = await parser.parse(unparsedArgs || process.argv.slice(2), this);
			let cmd = contexts[0];

			log('Parsing complete');

			if (this.help && argv.help) {
				log('Selected help command');
				cmd = this.commands.get('help');
				parser.contexts.unshift(cmd);

			} else if (!(cmd instanceof Command) && this.defaultCommand && this.commands.has(this.defaultCommand)) {
				log(`Selected default command: ${this.defaultCommand}`);
				cmd = this.commands.get(this.defaultCommand);
				parser.contexts.unshift(cmd);
			}

			if (cmd && typeof cmd.action === 'function') {
				log(`Executing command: ${cmd.name}`);
				return await cmd.action(parser);
			}

			log('No command to execute, returning parsed arguments');
			return parser;
		} catch (err) {
			error(err);

			const help = this.help && this.showHelpOnError !== false && this.commands.help;
			if (help) {
				return await help.action({
					contexts: err.contexts || parser.contexts || [ this ],
					err
				});
			}

			throw err;
		}
	}
}
