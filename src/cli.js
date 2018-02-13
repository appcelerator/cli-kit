import Command from './command';
import Context from './context';
import debug from './debug';

import { Writable } from 'stream';

const { log } = debug('cli-kit:cli');

/**
 * Defines a CLI context and is responsible for parsing the command line arguments.
 */
export default class CLI extends Context {
	/**
	 * Created a CLI instance.
	 *
	 * @param {Object} [opts] - Various options.
	 * @param {Array<Object>} [opts.args] - An array of arguments.
	 * @param {Boolean} [opts.camelCase=true] - Camel case option names.
	 * @param {Object} [opts.commands] - A map of command names to command descriptors.
	 * @param {Boolean} [opts.defaultCommand] - The default command to execute.
	 * @param {String} [params.desc] - The description of the CLI displayed in the help output.
	 * @param {Boolean} [opts.help=false] - When `true`, enables the built-in help command.
	 * @param {Number} [opts.helpExitCode] - The exit code to return when the help command is
	 * finished.
	 * @param {String} [opts.name] - The name of the program.
	 * @param {Array<Object>|Object} [opts.options] - An array of options.
	 * @param {Writable} [opts.out=process.stdout] - A stream to write output such as the help
	 * screen.
	 * @param {String} [opts.title='Global'] - The title for the global context.
	 * @param {String} [opts.version] - The program version.
	 * @param {Number} [opts.width] - The number of characters to wrap long descriptions. Defaults
	 * to `process.stdout.columns` if exists, otherwise `100`. Must be at least `40`.
	 * @access public
	 */
	constructor(opts = {}) {
		if (typeof opts !== 'object' || Array.isArray(opts)) {
			throw new TypeError('Expected argument to be an object or Context');
		}

		opts.out || (opts.out = process.stdout);
		if (!(opts.out instanceof Writable)) {
			throw new TypeError('Expected output stream to be a writable stream');
		}

		if (opts.helpExitCode !== undefined && typeof opts.helpExitCode !== 'number') {
			throw new TypeError('Expected help exit code to be a number');
		}

		if (opts.width !== undefined && typeof opts.width !== 'number') {
			throw new TypeError('Expected width to be a number');
		}

		opts.name || (opts.name = 'program');
		opts.title || (opts.title = 'Global');

		super(opts);

		// set the default command
		this.defaultCommand = opts.defaultCommand;

		// add the built-in help
		this.help = !!opts.help;
		if (this.help) {
			if (this.defaultCommand === undefined) {
				this.defaultCommand = 'help';
			}

			this.command('help', {
				hidden: true,
				action({ contexts }) {
					// the first context is the help command, so just skip to the second context
					contexts[1].renderHelp(opts.out);
					if (opts.helpExitCode !== undefined) {
						process.exit(opts.helpExitCode);
					}
				}
			});

			this.option('-h, --help', 'displays the help screen');
		}

		if (opts.version && !this.lookup.short.v && !this.lookup.long.version) {
			this.option('-v, --version', {
				callback() {
					opts.out.write(`${opts.version}\n`);
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
			throw new TypeError('Expected args to be an array');
		}

		const $args = await this.parse(unparsedArgs ? unparsedArgs.slice() : process.argv.slice(2));

		let cmd = $args.contexts[0];

		if (this.help && $args.argv.help) {
			cmd = this.commands.help;
			$args.contexts.unshift(cmd);

		} else if (!(cmd instanceof Command) && (this.commands[this.defaultCommand] instanceof Command)) {
			cmd = this.commands[this.defaultCommand];
			$args.contexts.unshift(cmd);
		}

		// execute the command
		if (cmd && typeof cmd.action === 'function') {
			return await cmd.action($args) || $args;
		}

		return $args;
	}
}
