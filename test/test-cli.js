import CLI, { ansi, Terminal } from '../dist/index';
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

		it('should error if default command does not exist', async () => {
			const cli = new CLI({
				defaultCommand: 'foo'
			});
			await expect(cli.exec([])).to.be.rejectedWith(Error, 'The default command "foo" was not found!');
		});

		it('should execute default command as a function', async () => {
			const spy = sinon.spy();
			const cli = new CLI({
				defaultCommand: spy
			});
			await cli.exec([]);
			expect(spy).to.be.calledOnce;
		});

		it('should throw exception showHelpOnError is false', async () => {
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

			expect(ansi.strip(out.toString())).to.equal([
				'My Amazing CLI, version 1.2.3',
				'Copyright (c) 2018, Me',
				'',
				'USAGE: test-cli [options]',
				'',
				'GLOBAL OPTIONS:',
				'  --no-banner  Suppress the banner',
				'  -h, --help   Displays the help screen',
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

			expect(ansi.strip(out.toString())).to.equal([
				'My Amazing CLI, version 1.2.3',
				'Copyright (c) 2018, Me',
				'',
				`${process.platform === 'win32' ? 'x' : '✖'} Error: Missing required argument "foo"`,
				'',
				'USAGE: test-cli <foo> [options]',
				'',
				'ARGUMENTS:',
				'  foo',
				'',
				'GLOBAL OPTIONS:',
				'  --no-banner  Suppress the banner',
				'  -h, --help   Displays the help screen',
				''
			].join('\n'));
		});

		it('should not display a banner when outputting JSON', async () => {
			const banner = 'My Amazing CLI, version 1.2.3\nCopyright (c) 2018, Me\n\n';
			const out = new WritableStream();
			const terminal = new Terminal({
				stdout: out,
				stderr: out
			});
			const cli = new CLI({
				banner,
				commands: {
					foo({ console }) {
						console.log(' ' + JSON.stringify({ foo: 'bar', baz: 123 }, null, '  '));
					}
				},
				name: 'test-cli',
				terminal
			});

			await cli.exec([ 'foo' ]);

			expect(out.toString()).to.equal([
				' {',
				'  "foo": "bar",',
				'  "baz": 123',
				'}',
				''
			].join('\n'));
		});

		it('should not display a banner when outputting XML', async () => {
			const banner = 'My Amazing CLI, version 1.2.3\nCopyright (c) 2018, Me\n\n';
			const out = new WritableStream();
			const terminal = new Terminal({
				stdout: out,
				stderr: out
			});
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
					foo({ console }) {
						console.log(xml);
					}
				},
				name: 'test-cli',
				terminal
			});

			await cli.exec([ 'foo' ]);

			expect(out.toString()).to.equal(`${xml}\n`);
		});
	});

	describe('exec()', () => {
		it('should error if Node.js version is too old', async () => {
			try {
				const cli = new CLI({
					nodeVersion: '>=999'
				});

				await cli.exec();
			} catch (err) {
				expect(err.message).to.equal(`This program requires Node.js version >=999, currently ${process.version}`);
				return;
			}

			throw new Error('Expected error');
		});

		it('should error if Node.js version is too old with custom name', async () => {
			try {
				const cli = new CLI({
					appName: 'Foo',
					nodeVersion: '>=999'
				});

				await cli.exec();
			} catch (err) {
				expect(err.message).to.equal(`Foo requires Node.js version >=999, currently ${process.version}`);
				return;
			}

			throw new Error('Expected error');
		});

		it('should error if arguments are not an array', async () => {
			try {
				const cli = new CLI();
				await cli.exec('foo');
			} catch (err) {
				expect(err).to.be.instanceof(TypeError);
				expect(err.message).to.equal('Expected arguments to be an array');
				return;
			}

			throw new Error('Expected error');
		});

		it('should error if options are not an object', async () => {
			try {
				const cli = new CLI();
				await cli.exec([], 'foo');
			} catch (err) {
				expect(err).to.be.instanceof(TypeError);
				expect(err.message).to.equal('Expected opts to be an object');
				return;
			}

			throw new Error('Expected error');
		});

		it('should error if terminal is not valid', async () => {
			try {
				const cli = new CLI();
				await cli.exec([], {
					terminal: 'foo'
				});
			} catch (err) {
				expect(err).to.be.instanceof(TypeError);
				expect(err.message).to.equal('Expected terminal to be a Terminal instance');
				return;
			}

			throw new Error('Expected error');
		});

		it('should error if data payload is not valid', async () => {
			try {
				const cli = new CLI();
				await cli.exec([], {
					data: 'foo'
				});
			} catch (err) {
				expect(err).to.be.instanceof(TypeError);
				expect(err.message).to.equal('Expected data to be an object');
				return;
			}

			throw new Error('Expected error');
		});

		it('should reparse unknown arguments if context changed', async () => {
			const typeSpy = sinon.spy();
			const platformSpy = sinon.spy();

			const cli = new CLI({
				options: {
					'--type <type>': {
						callback({ ctx }) {
							typeSpy();
							ctx.option('--platform <name>', {
								callback: platformSpy
							});
						}
					}
				}
			});

			await cli.exec([
				'--platform',
				'bar',
				'--type',
				'foo'
			], { clone: true });

			expect(typeSpy).to.be.calledOnce;
			expect(platformSpy).to.be.calledOnce;
		});
	});
});
