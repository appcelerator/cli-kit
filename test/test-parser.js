import CLI, { ansi, Terminal } from '../dist/index';
import path from 'path';
import { spawnSync } from 'child_process';
import { WritableStream } from 'memory-streams';
import { expect } from 'chai';

describe('Parser', () => {
	describe('Error Handling', () => {
		it('should error if args is not an array', async () => {
			const cli = new CLI();
			await expect(cli.exec('foo')).to.be.rejectedWith(TypeError, 'Expected arguments to be an array');
		});
	});

	describe('Data Type Coercion', () => {
		it('should coerce bool type', async () => {
			let results = await new CLI({
				options: {
					'--foo <value>': {
						type: 'bool'
					}
				}
			}).exec([ '--foo', 'true' ]);
			expect(results.argv.foo).to.equal(true);

			results = await new CLI({
				options: {
					'--foo <value>': {
						type: 'bool'
					}
				}
			}).exec([ '--foo', 'false' ]);
			expect(results.argv.foo).to.equal(false);

			results = await new CLI({
				options: {
					'--foo <value>': {}
				}
			}).exec([ '--foo', 'true' ]);
			expect(results.argv.foo).to.equal('true');

			results = await new CLI({
				options: {
					'--foo': {}
				}
			}).exec([ '--foo' ]);
			expect(results.argv.foo).to.equal(true);
		});
	});

	describe('Version', () => {
		it('should output the version', function () {
			this.slow(9000);
			this.timeout(10000);

			const env = Object.assign({}, process.env);
			delete env.SNOOPLOGG;

			const { status, stdout } = spawnSync(process.execPath, [ path.join(__dirname, 'examples', 'version-test', 'ver.js'), '--version' ], { env });
			expect(status).to.equal(0);
			expect(stdout.toString()).to.equal('1.2.3\n');
		});
	});

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

		it('should error if required option is missing value', async () => {
			const cli = new CLI({
				options: {
					'-b,--bar <value>': {}
				}
			});

			try {
				await cli.exec([ '-b' ]);
			} catch (e) {
				expect(e.message).to.equal('Missing 1 required option:');
				return;
			}

			throw new Error('Expected error');
		});

		it('should not error if optional option is missing value', async () => {
			const cli = new CLI({
				options: {
					'-b,--bar [value]': {}
				}
			});

			const result = await cli.exec([ '-b' ]);
			expect(result.argv).to.have.property('bar', '');
		});

		it('should default bool options without value', async () => {
			const cli = new CLI({
				options: {
					'-b,--bar <value>': { type: 'bool' }
				}
			});

			let result = await cli.exec([ '-b' ]);
			expect(result.argv).to.have.property('bar', true);

			result = await cli.exec([ '--bar' ]);
			expect(result.argv).to.have.property('bar', true);

			result = await cli.exec([ '--no-bar' ]);
			expect(result.argv).to.have.property('bar', false);
		});

		it('should error if required multiple option is not specified', async () => {
			const cli = new CLI({
				options: {
					'-b,--bar <value>': { multiple: true }
				}
			});

			await expect(cli.exec([ '-b' ])).to.eventually.be.rejectedWith(Error, 'Missing 1 required option:');
		});

		it('should not error if optional multiple option is not specified', async () => {
			const cli = new CLI({
				options: {
					'-b,--bar [value]': { multiple: true }
				}
			});

			const result = await cli.exec([ '-b' ]);
			expect(result.argv).to.have.property('bar');
			expect(result.argv.bar).to.have.lengthOf(0);
		});

		it('should not error if required multiple option has default', async () => {
			const cli = new CLI({
				options: {
					'-b,--bar <value>': { default: 'baz', multiple: true }
				}
			});

			const result = await cli.exec([ '-b' ]);
			expect(result.argv).to.have.property('bar');
			expect(result.argv.bar).to.deep.equal([ 'baz' ]);
		});

		it('should capture multiple options', async () => {
			const cli = new CLI({
				options: {
					'-b,--bar [value]': { multiple: true }
				}
			});

			const result = await cli.exec([ '-b', 'a', '--bar', 'b' ]);
			expect(result.argv).to.have.property('bar');
			expect(result.argv.bar).to.deep.equal([ 'a', 'b' ]);
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

			expect(ansi.strip(out.toString())).to.equal([
				'Error: Missing required argument "foo"',
				'',
				'USAGE: test-cli [options] <foo>',
				'',
				'ARGUMENTS:',
				'  foo       ',
				'',
				'GLOBAL OPTIONS:',
				'  -h, --help  Displays the help screen',
				''
			].join('\n'));
		});
	});

	describe('Callback', () => {
		it('should re-parse if default option callback changes options', async () => {
			const cli = new CLI({
				options: {
					'--foo [value]': {
						callback({ ctx }) {
							ctx.option('--bar [value]');
						}
					}
				}
			});

			const { argv } = await cli.exec([ '--bar', 'baz' ]);
			expect(argv.bar).to.equal('baz');
		});
	});
});
