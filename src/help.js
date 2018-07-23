import debug from './debug';
import E from './errors';

import { wrap } from './util';

const { log } = debug('cli-kit:help');

/**
 * The built-in help command parameters.
 *
 * @type {Object}
 */
export default {
	/**
	 * Executes the help command.
	 *
	 * @param {Object} params - Various parameters.
	 * @param {Object} [params.argv] - The parsed options.
	 * @param {Array.<Context>} params.contexts - The stack of contexts found during parsing.
	 * @param {Error} [params.err] - An error object in the event an error occurred.
	 * @returns {Promise}
	 */
	async action({ argv = {}, contexts, err } = {}) {
		let exitCode = +!!err;

		// skip the built-in help command and find the first context
		for (const ctx of contexts) {
			// we don't display help for the help command
			if (ctx.clikitHelp) {
				continue;
			}

			// if not rendering as json, we must determine the help renderer function
			let renderHelp;
			if (!argv.json) {
				renderHelp = ctx.get('helpRenderer');
				if (!renderHelp) {
					renderHelp = defaultHelpRenderer;
				} else if (typeof renderHelp !== 'function') {
					throw E.INVALID_ARGUMENT('Expected help renderer to be a function', { name: 'renderHelp', scope: 'help:action', value: renderHelp });
				}
			}

			// generate the help object
			const help = await ctx.generateHelp(err);

			// determine the output stream
			const out = ctx.get('out', err ? process.stderr : process.stdout);

			// print the help output
			if (argv.json) {
				out.write(JSON.stringify(help, null, '  ') + '\n');
			} else {
				renderHelp({
					help,
					out,
					width: ctx.get('width')
				});
			}

			// set the exit code
			exitCode = err ? 1 : ctx.get('helpExitCode');

			break;
		}

		process.exitCode = exitCode;
	},
	clikitHelp: true,
	hidden: true,
	options: {
		'--json': null
	}
};

/**
 * Formats the help object into beautiful output.
 *
 * @param {Object} params - Various parameters.
 * @param {Object} params.help - The help object containg the usage, description, commands,
 * arguments, and options.
 * @param {WritableStream} params.out - The stream to write output to.
 * @param {Number} params.width - The maximum width of the screen for which to wrap the help output.
 */
function defaultHelpRenderer({ help, out, width }) {
	width = Math.max(width || 100, 40);

	const { err, usage, desc } = help;

	if (err) {
		out.write(`${err.toString()}\n\n`);
	}

	if (usage) {
		out.write(`${usage.title}: ${usage.text}\n\n`);
	}

	if (desc) {
		out.write(`${wrap(desc, width)}\n\n`);
	}

	log(help);
}
