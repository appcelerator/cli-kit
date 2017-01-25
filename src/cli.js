import Arguments from './arguments';
import Command from './command';
import Context from './context';
import debug from 'debug';
import help from './help';

const log = debug('cli-kit:cli');

export default class CLI {
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
