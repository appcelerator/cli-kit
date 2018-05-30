import Command from './command';
import Context from './context';
import debug from './debug';
import E from './errors';

import { declareCLIKitClass } from './util';

const { log } = debug('cli-kit:cli');

/**
 * Defines a CLI context and is responsible for parsing the command line arguments.
 */
export default class CLI extends Context {
	/**
	 * Created a CLI instance.
	 *
	 * @param {Object} [params] - Various options.
	 * @param {String|Function} [params.banner] - A banner to display
	 * @param {Boolean} [params.defaultCommand] - The default command to execute.
	 * @param {Boolean} [params.help=false] - When `true`, enables the built-in help command.
	 * @param {Number} [params.helpExitCode] - The exit code to return when the help command is
	 * finished.
	 * @param {String} [params.name] - The name of the program.
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

		if (params.width !== undefined && typeof params.width !== 'number') {
			throw E.INVALID_ARGUMENT('Expected width to be a number', { name: 'params.width', scope: 'CLI.constructor', value: params.width });
		}

		params.name || (params.name = 'program');
		params.title || (params.title = 'Global');

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

			this.command('help', {
				hidden: true,
				action({ contexts, err }) {
					// the first context is the help command, so just skip to the second context
					contexts[1].renderHelp({ err });

					// istanbul ignore if
					if (params.helpExitCode !== undefined) {
						process.exit(params.helpExitCode);
					}
				}
			});

			this.option('-h, --help', 'displays the help screen');
		}

		if (params.version && !this.lookup.short.v && !this.lookup.long.version) {
			this.option('-v, --version', {
				callback: () => {
					const out = this.outputStream || process.stdout;
					out.write(`${params.version}\n`);
					process.exit(0);
				},
				desc: 'outputs the appcd version'
			});
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

		try {
			const $args = await this.parse(unparsedArgs ? unparsedArgs.slice() : process.argv.slice(2));

			let cmd = $args.contexts[0];

			if (this.help && $args.argv.help) {
				log('Selected help command');
				cmd = this.commands.help;
				$args.contexts.unshift(cmd);

			} else if (!(cmd instanceof Command) && this.defaultCommand && (this.commands[this.defaultCommand] instanceof Command)) {
				log(`Selected default command: ${this.defaultCommand}`);
				cmd = this.commands[this.defaultCommand];
				$args.contexts.unshift(cmd);
			}

			// execute the command
			if (cmd && typeof cmd.action === 'function') {
				return await cmd.action($args) || $args;
			}

			return $args;
		} catch (err) {
			const help = this.help && this.showHelpOnError !== false && this.commands.help;
			if (help) {
				return await help.action({
					contexts: [ help, this ],
					err
				});
			}

			throw err;
		}
	}
}
