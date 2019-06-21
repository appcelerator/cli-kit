// import Parser from '../dist/parser/parser';
import CLI, { Terminal } from '../dist/index';

import { WritableStream } from 'memory-streams';

describe('Parser', () => {
	describe('Options', () => {
		it('should parse negated multi-word options', async () => {
			const cli = new CLI({
				options: {
					'--no-foo-bar': 'to foo or not to bar'
				}
			});

			let result = await cli.exec([ '--no-foo-bar' ]);
			expect(result.argv).to.have.property('fooBar', false);

			result = await cli.exec([ '--foo-bar' ]);
			expect(result.argv).to.have.property('fooBar', true);
		});

		it('should use default if no value specified', async () => {
			const cli = new CLI({
				commands: {
					foo: {
						options: {
							'-b,--bar <value>': {
								default: 'baz'
							}
						}
					}
				}
			});

			const result = await cli.exec([ 'foo', '-b' ]);
			expect(result.argv).to.have.property('bar', 'baz');
		});
	});

	describe('Validation', () => {
		it('should show help when missing required argument', async () => {
			const out = new WritableStream();
			const terminal = new Terminal({
				stdout: out,
				stderr: out
			});

			const cli = new CLI({
				args: [
					{
						name: 'foo',
						required: true
					}
				],
				colors: false,
				help: true,
				name: 'test-cli',
				terminal
			});

			await cli.exec([]);

			expect(out.toString()).to.equal([
				'Error: Missing required argument "foo"',
				'',
				'USAGE: test-cli [options] <foo>',
				'',
				'ARGUMENTS:',
				'  foo',
				'',
				'GLOBAL OPTIONS:',
				'  -h,--help  Displays the help screen',
				'',
				''
			].join('\n'));
		});
	});
});
