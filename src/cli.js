import Arguments from './arguments';
import Command from './command';
import Context from './context';
import help from './help';
import logger from './logger';
import snooplogg from 'snooplogg';

const { log } = logger('cli-kit:cli');

/**
 * Defines a CLI context and is responsible for parsing the command line arguments.
 */
export default class CLI {
	/**
	 * Created a CLI instance.
	 *
	 * @param {Object} [opts] - Various options.
	 * @param {Array<Object>} [opts.args] - An array of arguments.
	 * @param {Boolean} [opts.camelCase=true] - Camel case option names.
	 * @param {Object} [opts.commands] - A map of command names to command descriptors.
	 * @param {Boolean} [opts.default='help'] - The default command to execute.
	 * @param {Boolean} [opts.help=true] - When `true`, enabled the built-in help command.
	 * @param {Array<Object>|Object} [opts.options] - An array of options.
	 * @param {String} [opts.program] - The name of the program.
	 * @param {String} [opts.title='Global'] - The title for the global context.
	 * @access public
	 */
	constructor(opts = {}) {
		if (typeof opts !== 'object' || Array.isArray(opts)) {
			throw new TypeError('Expected argument to be an object or Context');
		}

		opts.title || (opts.title = 'Global');
		this.ctx = new Context(opts);

		// set the default command
		this.default  = opts.default || 'help';
		this.help     = opts.help !== false;

		// context methods
		this.argument = this.ctx.argument.bind(this.ctx);
		this.command  = this.ctx.command.bind(this.ctx);
		this.option   = this.ctx.option.bind(this.ctx);

		// hook emitter methods
		this.on       = this.ctx.on.bind(this.ctx);
		this.once     = this.ctx.once.bind(this.ctx);
		this.off      = this.ctx.off.bind(this.ctx);

		// add the built-in help
		if (this.help) {
			if (!this.ctx.commands.help) {
				this.command(help);
			}

			if (!this.ctx.lookup.long.help) {
				this.option('-h, --help');
			}
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

		const $args = await this.ctx.parse(args ? args.slice() : process.argv.slice(2));

		let cmd = this.help && $args.argv.help ? 'help' : $args.contexts[0];

		// if there was no command found, then set the default command
		if (!(cmd instanceof Command)) {
			cmd = this.ctx.commands[this.default];
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
