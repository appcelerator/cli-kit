import CLI from '../dist/index';
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

		it('should error if stdout is not an object with a write() method', () => {
			expectThrow(() => {
				new CLI({
					stdout: 'foo'
				});
			}, {
				type:  TypeError,
				msg:   'Expected stdout stream to be a writable stream',
				code:  'ERR_INVALID_ARGUMENT',
				name:  'stdout',
				scope: 'CLI.constructor',
				value: 'foo'
			});

			const obj = {};
			expectThrow(() => {
				new CLI({
					stdout: obj
				});
			}, {
				type:  TypeError,
				msg:   'Expected stdout stream to be a writable stream',
				code:  'ERR_INVALID_ARGUMENT',
				name:  'stdout',
				scope: 'CLI.constructor',
				value: obj
			});

			obj.write = 'foo';

			expectThrow(() => {
				new CLI({
					stdout: obj
				});
			}, {
				type:  TypeError,
				msg:   'Expected stdout stream to be a writable stream',
				code:  'ERR_INVALID_ARGUMENT',
				name:  'stdout',
				scope: 'CLI.constructor',
				value: obj
			});
		});

		it('should error if stderr is not an object with a write() method', () => {
			expectThrow(() => {
				new CLI({
					stderr: 'foo'
				});
			}, {
				type:  TypeError,
				msg:   'Expected stderr stream to be a writable stream',
				code:  'ERR_INVALID_ARGUMENT',
				name:  'stderr',
				scope: 'CLI.constructor',
				value: 'foo'
			});

			const obj = {};
			expectThrow(() => {
				new CLI({
					stderr: obj
				});
			}, {
				type:  TypeError,
				msg:   'Expected stderr stream to be a writable stream',
				code:  'ERR_INVALID_ARGUMENT',
				name:  'stderr',
				scope: 'CLI.constructor',
				value: obj
			});

			obj.write = 'foo';

			expectThrow(() => {
				new CLI({
					stderr: obj
				});
			}, {
				type:  TypeError,
				msg:   'Expected stderr stream to be a writable stream',
				code:  'ERR_INVALID_ARGUMENT',
				name:  'stderr',
				scope: 'CLI.constructor',
				value: obj
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

		it('should error if when adding an existing command', () => {
			expectThrow(() => {
				const cli = new CLI({
					commands: {
						foo: {}
					}
				});

				cli.command('foo');
			}, {
				type:  Error,
				msg:   'Command "foo" already exists',
				code:  'ERR_ALREADY_EXISTS',
				name:  'cmd',
				scope: 'Context.registerCommand'
			});
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

		it.skip('should display a banner before command output', async () => {
			const banner = 'My Amazing CLI, version 1.2.3\nCopyright (c) 2018, Me';
			const out = new WritableStream();
			const cli = new CLI({
				banner,
				colors: false,
				help: true,
				name: 'test-cli',
				out
			});

			await cli.exec([]);

			expect(out.toString()).to.equal([
				'My Amazing CLI, version 1.2.3',
				'Copyright (c) 2018, Me',
				'',
				'Usage: test-cli [options]',
				'',
				// 'Global options:',
				// '  -h, --help   displays the help screen',
				// '  --no-banner  suppress the banner',
				// '',
				''
			].join('\n'));
		});

		it.skip('should display a banner when running a command', async () => {
			const banner = 'My Amazing CLI, version 1.2.3\nCopyright (c) 2018, Me\n\n';
			const out = new WritableStream();
			const cli = new CLI({
				banner,
				commands: {
					foo() {
						out.write('Testing... 1, 2, 3\n');
					}
				},
				name: 'test-cli',
				out
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

				const { status, stdout, stderr } = spawnSync(process.execPath, [ path.join(__dirname, 'examples', 'version-test', 'ver.js'), '--version' ]);
				expect(status).to.equal(0);
				expect(stdout.toString()).to.equal('1.2.3\n');
			});
		});
	});
});
