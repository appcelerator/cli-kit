const help = {
	name: 'help',
	action: ({ contexts }) => {
		// the first context is the help command, so just skip to the second context
		contexts[1].renderHelp(console.log);
	}
};

export default help;
