import CLI from 'cli-kit';

const cli = new CLI({
	commands: {
		login() {
			console.log('Doing login!');
		}
	}
});

cli.command('logout', {
	action() {
		console.log('Bye!');
	}
});

cli.exec().catch(err => {
	console.error(err);
	process.exit(err.exitCode || 1);
});
