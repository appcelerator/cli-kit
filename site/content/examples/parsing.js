import CLI from 'cli-kit';

(async () => {
	const { _ } = await new CLI().exec();

	console.log('Arguments:');
	console.log(_);

})().catch(err => {
	console.error(err);
	process.exit(err.exitCode || 1);
});
