import Command from './command';
import Context from './context';
import help from './help';
import logger from './logger';

import { Writable } from 'stream';

const { log } = logger('cli-kit:cli');

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
	 * @param {Boolean} [opts.default='help'] - The default command to execute.
	 * @param {Boolean} [opts.help=true] - When `true`, enabled the built-in help command.
	 * @param {Number} [opts.helpExitCode=1] - The exit code to return when the help command is
	 * finished.
	 * @param {String} [opts.name] - The name of the program.
	 * @param {Array<Object>|Object} [opts.options] - An array of options.
	 * @param {String} [opts.title='Global'] - The title for the global context.
	 * @param {String} [opts.version] - The program version.
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

		opts.name || (opts.name = 'program');
		opts.title || (opts.title = 'Global');

		super(opts);

		// set the default command
		this.default  = opts.default || 'help';

		// add the built-in help
		this.help = opts.help !== false;
		if (this.help) {
			if (!this.commands.help) {
				this.command(help(opts.helpExitCode));
			}

			if (!this.lookup.long.help) {
				this.option('-h, --help');
			}
		}

		if (opts.version && !this.lookup.long.version) {
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
	 * @param {Array} [args] - An array of arguments to parse. If not specified, it defaults to the
	 * `process.argv` starting with the 3rd argument.
	 * @returns {Promise}
	 * @access public
	 */
	async exec(args) {
		if (args && !Array.isArray(args)) {
			throw new TypeError('Expected args to be an array');
		}

		const $args = await this.parse(args ? args.slice() : process.argv.slice(2));

		let cmd = this.help && $args.argv.help ? 'help' : $args.contexts[0];

		// if there was no command found, then set the default command
		if (!(cmd instanceof Command)) {
			cmd = this.commands[this.default];
			if (cmd) {
				$args.contexts.unshift(cmd);
			}
		}

		// execute the command
		if (cmd && typeof cmd.action === 'function') {
			return await cmd.action($args);
		}

		return $args;
	}
}
