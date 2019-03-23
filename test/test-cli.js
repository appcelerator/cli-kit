import CLI, { Terminal } from '../dist/index';
import path from 'path';

import { spawnSync } from 'child_process';
import { WritableStream } from 'memory-streams';

describe('CLI', () => {
	describe('Constructor', () => {
		it('should error if params is not an object', () => {
			expectThrow(() => {
				new CLI('foo');
			}, {
				type:  TypeError,
				msg:   'Expected CLI parameters to be an object or Context',
				code:  'ERR_INVALID_ARGUMENT',
				name:  'params',
				scope: 'CLI.constructor',
				value: 'foo'
			});
		});

		it('should error if extensions parameter is not an object', () => {
			expectThrow(() => {
				new CLI({
					extensions: 'foo'
				});
			}, {
				type:  TypeError,
				msg:   'Expected extensions to be an array of extension paths or an object of names to extension paths',
				code:  'ERR_INVALID_ARGUMENT',
				name:  'extensions',
				scope: 'CLI.constructor',
				value: 'foo'
			});
		});

		it('should error if terminal is not valid', () => {
			expectThrow(() => {
				new CLI({
					terminal: 'foo'
				});
			}, {
				type:  TypeError,
				msg:   'Expected terminal to be a Terminal instance',
				code:  'ERR_INVALID_ARGUMENT',
				name:  'terminal',
				scope: 'CLI.constructor',
				value: 'foo'
			});
		});

		it('should error if the help exit code is not a number', () => {
			expectThrow(() => {
				new CLI({
					helpExitCode: 'foo'
				});
			}, {
				type:  TypeError,
				msg:   'Expected help exit code to be a number',
				code:  'ERR_INVALID_ARGUMENT',
				name:  'helpExitCode',
				scope: 'CLI.constructor',
				value: 'foo'
			});
		});

		it('should error if default command is not a string or function', () => {
			expectThrow(() => {
				new CLI({
					defaultCommand: null
				});
			}, {
				type:  Error,
				msg:   'Expected default command to be a string or function',
				code:  'ERR_INVALID_ARGUMENT',
				name:  'defaultCommand',
				scope: 'CLI.constructor',
				value: null
			});

			expectThrow(() => {
				new CLI({
					defaultCommand: 123
				});
			}, {
				type:  Error,
				msg:   'Expected default command to be a string or function',
				code:  'ERR_INVALID_ARGUMENT',
				name:  'defaultCommand',
				scope: 'CLI.constructor',
				value: 123
			});
		});

		it('should throw exception showHelpOnError is false', async () => {
			const out = new WritableStream();

			const cli = new CLI({
				showHelpOnError: false,
				commands: {
					foo() {
						throw new Error('errors!');
					}
				},
				name: 'test-cli'
			});
			expect(cli.showHelpOnError).to.equal(false);

			try {
				await cli.exec([ 'foo' ]);
			} catch (err) {
				expect(err.message).to.equal('errors!');
				return;
			}

			expect.fail('Expected error');
		});
	});

	describe('Banner', () => {
		it('should throw error if banner is not a string or function', () => {
			expectThrow(() => {
				new CLI({
					banner: {}
				});
			}, {
				type:  TypeError,
				msg:   'Expected banner to be a string or function',
				code:  'ERR_INVALID_ARGUMENT',
				name:  'banner',
				scope: 'CLI.constructor'
			});

			expectThrow(() => {
				new CLI({
					banner: null
				});
			}, {
				type:  TypeError,
				msg:   'Expected banner to be a string or function',
				code:  'ERR_INVALID_ARGUMENT',
				name:  'banner',
				scope: 'CLI.constructor'
			});
		});

		it('should display a banner before command output', async () => {
			const banner = 'My Amazing CLI, version 1.2.3\nCopyright (c) 2018, Me';
			const out = new WritableStream();
			const terminal = new Terminal({
				stdout: out,
				stderr: out
			});

			const cli = new CLI({
				banner,
				colors: false,
				help: true,
				name: 'test-cli',
				terminal
			});

			await cli.exec([]);

			// process.stdout.write(out.toString() + '\n');

			expect(out.toString()).to.equal([
				'My Amazing CLI, version 1.2.3',
				'Copyright (c) 2018, Me',
				'',
				'USAGE: test-cli [options]',
				'',
				'GLOBAL OPTIONS:',
				'  -h,--help  displays the help screen',
				'  --no-banner  suppress the banner',
				'',
				''
			].join('\n'));
		});

		it('should display a banner when running a command', async () => {
			const banner = 'My Amazing CLI, version 1.2.3\nCopyright (c) 2018, Me\n\n';
			const out = new WritableStream();
			const terminal = new Terminal({
				stdout: out,
				stderr: out
			});
			const cli = new CLI({
				banner,
				commands: {
					foo() {
						out.write('Testing... 1, 2, 3\n');
					}
				},
				name: 'test-cli',
				terminal
			});

			await cli.exec([ 'foo' ]);

			expect(out.toString()).to.equal([
				'My Amazing CLI, version 1.2.3',
				'Copyright (c) 2018, Me',
				'',
				'Testing... 1, 2, 3',
				''
			].join('\n'));
		});

		it('should display a banner when a validation error occurs', async () => {
			const banner = 'My Amazing CLI, version 1.2.3\nCopyright (c) 2018, Me';
			const out = new WritableStream();
			const terminal = new Terminal({
				stdout: out,
				stderr: out
			});
			const cli = new CLI({
				banner,
				colors: false,
				help: true,
				name: 'test-cli',
				terminal,
				args: [
					{
						name: 'foo',
						required: true
					}
				]
			});

			await cli.exec([]);

			// process.stdout.write(out.toString() + '\n');

			expect(out.toString()).to.equal([
				'My Amazing CLI, version 1.2.3',
				'Copyright (c) 2018, Me',
				'',
				'Missing required argument "foo"',
				'',
				'USAGE: test-cli [options] <foo>',
				'',
				'ARGUMENTS:',
				'  foo',
				'',
				'GLOBAL OPTIONS:',
				'  -h,--help  displays the help screen',
				'  --no-banner  suppress the banner',
				'',
				''
			].join('\n'));
		});

		it('should not display a banner when outputting JSON', async () => {
			const banner = 'My Amazing CLI, version 1.2.3\nCopyright (c) 2018, Me\n\n';
			const out = new WritableStream();
			const cli = new CLI({
				banner,
				commands: {
					foo() {
						out.write(' ' + JSON.stringify({ foo: 'bar', baz: 123 }, null, '  '));
					}
				},
				name: 'test-cli',
				out
			});

			await cli.exec([ 'foo' ]);

			expect(out.toString()).to.equal([
				' {',
				'  "foo": "bar",',
				'  "baz": 123',
				'}'
			].join('\n'));
		});

		it('should not display a banner when outputting XML', async () => {
			const banner = 'My Amazing CLI, version 1.2.3\nCopyright (c) 2018, Me\n\n';
			const out = new WritableStream();
			const xml = [
				'',
				'<?xml version="1.0"?>',
				'<foo>',
				'  <bar>baz</bar>',
				'</foo>'
			].join('\n');
			const cli = new CLI({
				banner,
				commands: {
					foo() {
						out.write(xml);
					}
				},
				name: 'test-cli',
				out
			});

			await cli.exec([ 'foo' ]);

			expect(out.toString()).to.equal(xml);
		});
	});

	describe('Parsing', () => {
		describe('Error Handling', () => {
			it('should error if args is not an array', () => {
				return new CLI()
					.exec('foo')
					.then(() => {
						throw new Error('Expected an error');
					}, err => {
						expect(err).to.be.instanceof(TypeError);
						expect(err.message).to.equal('Expected arguments to be an array');
					});
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

				const { status, stdout, stderr } = spawnSync(process.execPath, [ path.join(__dirname, 'examples', 'version-test', 'ver.js'), '--version' ], { env });
				expect(status).to.equal(0);
				expect(stdout.toString()).to.equal('1.2.3\n');
			});
		});
	});
});
