import Command from './command';
import Context from './context';
import debug from './debug';
import E from './errors';
import Formatter from './formatter';
import helpCommand from './help';
import Parser from './parser';

import { declareCLIKitClass } from './util';

const { error, log } = debug('cli-kit:cli');
const { highlight }  = debug.styles;

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
	 * @param {Object} [params.formatOpts] - Various formatter options such as the preferred display
	 * width, extensions, etc.
	 * @param {Boolean} [params.help=false] - When `true`, enables the built-in help command.
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
	 * @access public
	 */
	constructor(params = {}) {
		if (typeof params !== 'object' || Array.isArray(params)) {
			throw E.INVALID_ARGUMENT('Expected CLI parameters to be an object or Context', { name: 'params', scope: 'CLI.constructor', value: params });
		}

		if (params.out && (typeof params.out !== 'object' || typeof params.out.write !== 'function')) {
			throw E.INVALID_ARGUMENT('Expected output stream to be a writable stream', { name: 'out', scope: 'CLI.constructor', value: params.out });
		}

		if (params.helpExitCode !== undefined && typeof params.helpExitCode !== 'number') {
			throw E.INVALID_ARGUMENT('Expected help exit code to be a number', { name: 'helpExitCode', scope: 'CLI.constructor', value: params.helpExitCode });
		}

		if (params.banner !== undefined && typeof params.banner !== 'string' && typeof params.banner !== 'function') {
			throw E.INVALID_ARGUMENT('Expected banner to be a string or function', { name: 'banner', scope: 'CLI.constructor', value: params.banner });
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

		// init the output streams
		// note that `this.out` does NOT show the banner, but writing to `this.stdout` or
		// `this.stderr` WILL show the banner when the output has not been auto detected as xml/json
		this.stdout = new Formatter(this.formatOpts);
		this.stdout.pipe(this.out || process.stdout);

		this.stderr = new Formatter(this.formatOpts);
		this.stderr.pipe(this.out || process.stdout);

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
			this.option('--no-banner', {
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

		const parser = new Parser();

		try {
			const { argv, _, contexts } = await parser.parse(unparsedArgs || process.argv.slice(2), this);
			let cmd = contexts[0];

			log('Parsing complete');

			// determine the command to run
			if (this.help && argv.help) {
				log('Selected help command');
				cmd = this.commands.get('help');
				parser.contexts.unshift(cmd);

			} else if (!(cmd instanceof Command) && this.defaultCommand && this.commands.has(this.defaultCommand)) {
				log(`Selected default command: ${this.defaultCommand}`);
				cmd = this.commands.get(this.defaultCommand);
				parser.contexts.unshift(cmd);
			}

			// wire up the banner
			let banner = this.get('banner');
			if (banner && argv.banner) {
				banner = String(typeof banner === 'function' ? await banner() : banner).trim();
				const showBanner = write => {
					banner && write(`${banner}\n\n`);
					banner = null;
				};
				this.stdout.once('banner', showBanner);
				this.stderr.once('banner', showBanner);
			}

			// execute the command
			if (cmd && typeof cmd.action === 'function') {
				log(`Executing command: ${highlight(cmd.name)}`);
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
