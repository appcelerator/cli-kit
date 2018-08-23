import debug from '../lib/debug';
import path from 'path';

import { renderFile } from '../render/template';

const { log } = debug('cli-kit:help');
const { highlight } = debug.styles;

/**
 * The built-in help command parameters.
 *
 * @type {Object}
 */
export default {
	clikitHelp: true,

	hidden: true,

	options: {
		'--json': null
	},

	/**
	 * Executes the help command.
	 *
	 * @param {Object} params - Various parameters.
	 * @param {Object} [params.argv] - The parsed options.
	 * @param {Array.<Context>} params.contexts - The stack of contexts found during parsing.
	 * @param {Error} [params.err] - An error object in the event an error occurred.
	 * @param {Array.<Error>} [params.warnings] - A list of warnings (error objects).
	 * @returns {Promise}
	 */
	async action({ argv = {}, contexts, err, warnings } = {}) {
		let exitCode = +!!err;

		// skip the built-in help command and find the first context
		for (const ctx of contexts) {
			// we don't display help for the help command
			if (ctx.clikitHelp) {
				continue;
			}

			// generate the help object
			const help = await ctx.generateHelp({ err, warnings });

			const formatError = err => {
				return err ? {
					code:    err.code,
					message: err.message,
					stack:   err.stack,
					type:    err.constructor && err.constructor.name || null
				} : null;
			};

			help.error = formatError(err);
			help.warnings = Array.isArray(warnings) ? warnings.map(formatError) : null;

			// determine the output stream
			const out = ctx.get(err ? 'stderr' : 'stdout');

			// print the help output
			if (argv.json) {
				out.write(JSON.stringify(help, null, '  ') + '\n');
			} else {
				const file = ctx.get('helpTemplate', path.resolve(__dirname, '..', '..', 'templates', 'help.tpl'));
				log(`Rendering help template: ${highlight(file)}`);
				out.write(renderFile(file, help));
			}

			// set the exit code
			exitCode = err ? 1 : ctx.get('helpExitCode');

			break;
		}

		process.exitCode = exitCode;
	}
};
