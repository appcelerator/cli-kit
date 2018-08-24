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
	 * @param {String} [params.unknownCommand] - The name of the unknown command.
	 * @param {Array.<Error>} [params.warnings] - A list of warnings (error objects).
	 * @returns {Promise}
	 */
	async action({ _, argv = {}, contexts, err, unknownCommand, warnings } = {}) {
		let exitCode = +!!err;

		// skip the built-in help command and find the first context
		for (const ctx of contexts) {
			// we don't display help for the help command
			if (ctx.clikitHelp) {
				continue;
			}

			// generate the help object
			const help = await ctx.generateHelp({ err, warnings });

			// check if we should error if passed an invalid command
			if (!err && _.length && (ctx.get('errorIfUnknownCommand') || argv.help)) {
				const unknownCommand = _[0];
				err = new Error(`Unknown command "${unknownCommand}"`);

				const levenshtein = require('fast-levenshtein');
				help.suggestions = Array.from(ctx.commands.values())
					.map(cmd => ({ name: cmd.name, desc: cmd.desc, dist: levenshtein.get(unknownCommand, cmd.name) }))
					.filter(s => s.dist <= 2)
					.sort((a, b) => {
						const r = a.dist - b.dist;
						return r !== 0 ? r : a.name.localeCompare(b.name);
					});
			}

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

			// we only loop until we hit the first valid context... generateHelp() will recurse
			// parent contexts for us
			break;
		}

		process.exitCode = exitCode;
	}
};
