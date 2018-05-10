const CLI = require('cli-kit').CLI;

const cli = module.exports = new CLI({
	args: [
		{
			name: 'foo',
			desc: 'the first arg'
		},
		'bar'
	],
	options: [
		'Group 1',
		{
			'--baz <value>': {
				desc: 'set baz'
			}
		},
		'Group 2',
		{
			'-a, --append': {}
		}
	],
	commands: {
		stuff: {
			action() {
				cli.outputStream.write('bar!\n');
			},
			desc: 'perform magic'
		}
	},
	name: 'cli-kit-plugin'
});
