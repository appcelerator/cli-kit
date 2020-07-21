import debug from '../lib/debug';
import path from 'path';

import { renderFile } from '../render/template';

const { log } = debug('cli-kit:help');
const { highlight } = debug.styles;

/**
 * Renders help for a specific context, and its parent contexts, to a string. This function is
 * passed into the selected command's `action()` as a property called `help()` so that a command
 * can render its own help output.
 *
 * @param {Context} ctx - The context to render help.
 * @param {Object} [opts] - Various options to pass into `generateHelp()`.
 * @returns {String}
 */
export async function renderHelp(ctx, opts) {
	const file = ctx.get('helpTemplateFile', path.resolve(__dirname, '..', '..', 'templates', 'help.tpl'));
	log(`Rendering help template: ${highlight(file)}`);
	return renderFile(file, await ctx.generateHelp(opts));
}

/**
 * The built-in help command parameters.
 *
 * @type {Object}
 */
export default {
	/**
	 * Indicates this command is the built-in cli-kit help command so that if the CLI instance this
	 * command belongs to gets added to another CLI instance, we don't copy it over.
	 * @type {Boolean}
	 */
	clikitHelp: true,

	/**
	 * While this is a command, we don't want to show it since we already show the `--help` flag.
	 * @type {Boolean}
	 */
	hidden: true,

	/**
	 * Output the help as JSON. Neato.
	 * @type {Object}
	 */
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
	 * @param {Function} params.exitCode - A function that sets the exit code.
	 * @param {Array.<String>} [params.parentContextNames] - An array of parent context names.
	 * @param {String} [params.unknownCommand] - The name of the unknown command.
	 * @param {Array.<Error>} [params.warnings] - A list of warnings (error objects).
	 * @returns {Promise}
	 */
	async action({ _ = [], argv = {}, console, contexts, err, exitCode, parentContextNames, styles, warnings } = {}) {
		exitCode(+!!err); // 0=success, 1=error

		const formatError = err => {
			const type = err && err.constructor && err.constructor.name || null;
			return err ? {
				code:    err.code,
				message: !argv.json && type ? `${type}: ${err.message}` : err.message,
				meta:    err.meta,
				stack:   err.stack,
				type
			} : null;
		};

		// skip the built-in help command and find the first context
		for (const ctx of contexts) {
			// we don't display help for the help command
			if (ctx.clikitHelp) {
				continue;
			}

			// generate the help object
			const help = await ctx.generateHelp({ err, parentContextNames, warnings });

			// check if we should error if passed an invalid command
			if (!err && _.length && (ctx.get('errorIfUnknownCommand') || argv.help)) {
				const unknownCommand = _[0];
				err = new Error(`Unknown command "${unknownCommand}"`);

				const levenshtein = require('fast-levenshtein');
				help.suggestions = help.commands.entries
					.map(cmd => ({ name: cmd.name, desc: cmd.desc, dist: levenshtein.get(unknownCommand, cmd.name) }))
					.filter(s => s.dist <= 2)
					.sort((a, b) => {
						const r = a.dist - b.dist;
						return r !== 0 ? r : a.name.localeCompare(b.name);
					});
			}

			help.error = formatError(err);
			help.warnings = Array.isArray(warnings) ? warnings.map(formatError) : null;

			const { _stdout, _stderr } = console;

			// print the help output
			if (argv.json) {
				_stdout.write(JSON.stringify(help, null, '  '));
				_stdout.write('\n');
			} else {
				const file = ctx.get('helpTemplateFile', path.resolve(__dirname, '..', '..', 'templates', 'help.tpl'));
				log(`Rendering help template: ${highlight(file)}`);

				// determine the output stream
				(err ? _stderr : _stdout).write(renderFile(file, {
					style: styles,
					header: null,
					footer: null,
					...help
				}));
			}

			// set the exit code
			exitCode(err ? 1 : ctx.get('helpExitCode'));

			// we only loop until we hit the first valid context... generateHelp() will recurse
			// parent contexts for us
			break;
		}
	}
};
