export default {
	async action({ argv, contexts, err }) {
		let exitCode = +!!err;

		// skip the built-in help command and find the first context
		for (const ctx of contexts) {
			if (ctx.clikitHelp) {
				continue;
			}

			const help = await ctx.generateHelp({ err });
			const out = ctx.get('out', err ? process.stderr : process.stdout);
			const width = Math.max(ctx.get('width', process.stdout.columns || 100), 40);

			exitCode = err ? 1 : ctx.get('helpExitCode');

			console.log(argv);
			console.log();
			console.log(help);

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
