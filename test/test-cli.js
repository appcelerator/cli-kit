import CLI from '../dist/index';
import path from 'path';

import { spawnSync } from 'child_process';

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

		it('should error if out is not an object with a write() method', () => {
			expectThrow(() => {
				new CLI({
					out: 'foo'
				});
			}, {
				type:  TypeError,
				msg:   'Expected output stream to be a writable stream',
				code:  'ERR_INVALID_ARGUMENT',
				name:  'params.out',
				scope: 'CLI.constructor',
				value: 'foo'
			});

			const obj = {};
			expectThrow(() => {
				new CLI({
					out: obj
				});
			}, {
				type:  TypeError,
				msg:   'Expected output stream to be a writable stream',
				code:  'ERR_INVALID_ARGUMENT',
				name:  'params.out',
				scope: 'CLI.constructor',
				value: obj
			});

			obj.write = 'foo';

			expectThrow(() => {
				new CLI({
					out: obj
				});
			}, {
				type:  TypeError,
				msg:   'Expected output stream to be a writable stream',
				code:  'ERR_INVALID_ARGUMENT',
				name:  'params.out',
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
				name:  'params.helpExitCode',
				scope: 'CLI.constructor',
				value: 'foo'
			});
		});

		it('should error if the width is not a number', () => {
			expectThrow(() => {
				new CLI({
					width: 'foo'
				});
			}, {
				type:  TypeError,
				msg:   'Expected width to be a number',
				code:  'ERR_INVALID_ARGUMENT',
				name:  'params.width',
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

				const { status, stdout } = spawnSync(process.execPath, [ path.join(__dirname, 'examples', 'version-test', 'ver.js'), '--version' ]);
				expect(status).to.equal(0);
				expect(stdout.toString()).to.equal('1.2.3\n');
			});
		});
	});
});
