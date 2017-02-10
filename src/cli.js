import Arguments from './arguments';
import Command from './command';
import Context from './context';
import help from './help';
import snooplogg from 'snooplogg';

const log = snooplogg.config({ theme: 'detailed' })('cli-kit:cli').log;

/**
 * Defines a CLI context and is responsible for parsing the command line
 * arguments.
 */
export default class CLI {
	/**
	 * Created a CLI instance.
	 *
	 * @param {Object} [opts] - Various options.
	 * @param {Array<Object>} [opts.args] - An array of arguments.
	 * @param {Boolean} [opts.camelCase=true] - Camel case option names.
	 * @param {Object} [opts.commands] - A map of command names to command
	 * descriptors.
	 * @param {Boolean} [opts.help=true] - When true, displays the auto-
	 * generated help screen if there is no active command.
	 * @param {Array<Object>|Object} [opts.options] - An array of options.
	 * @param {String} [opts.title='Global'] - The title for the global context.
	 */
	constructor(opts = {}) {
		if (typeof opts !== 'object' || Array.isArray(opts)) {
			throw new TypeError('Expected argument to be an object or Context');
		}

		opts.title || (opts.title = 'Global');
		this.ctx = new Context(opts);

		// context methods
		this.argument = this.ctx.argument.bind(this.ctx);
		this.command  = this.ctx.command.bind(this.ctx);
		this.option   = this.ctx.option.bind(this.ctx);

		// hook emitter methods
		this.on       = this.ctx.on.bind(this.ctx);
		this.once     = this.ctx.once.bind(this.ctx);
		this.off      = this.ctx.off.bind(this.ctx);

		this.help = opts.help !== false;
		if (this.help) {
			this.command(help);
		}
	}

	exec(args) {
		if (args && !Array.isArray(args)) {
			throw new TypeError('Expected args to be an array');
		}

		return Promise.resolve()
			.then(() => this.ctx.parse(args ? args.slice() : process.argv.slice(2)))
			.then($args => {
				let cmd = $args.contexts[0];
				if (!(cmd instanceof Command) && this.help) {
					$args.contexts.unshift(cmd = this.ctx.commands.help);
				}

				if (cmd && typeof cmd.action === 'function') {
					return Promise.resolve().then(() => cmd.action($args));
				}

				return Promise.resolve($args);
			});
	}
}
