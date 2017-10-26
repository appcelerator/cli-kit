/**
 * Constructs the help command.
 *
 * @param {Number} [exitCode=1] - The exit code to return when the help command is finished.
 * @returns {Object}
 */
export default function (exitCode = 1) {
	return {
		name: 'help',
		action: ({ contexts }) => {
			// the first context is the help command, so just skip to the second context
			contexts[1].renderHelp(console.log);
			process.exit(exitCode);
		}
	};
}
