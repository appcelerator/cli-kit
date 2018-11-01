/* eslint no-control-regex:0 */

import CLI, { Extension, Terminal } from '../dist/index';
import path from 'path';
import snooplogg from 'snooplogg';

import { spawnSync } from 'child_process';
import { tmpDir } from 'tmp';
import { WritableStream } from 'memory-streams';

const { chalk } = snooplogg;

describe('Extension', () => {
	describe('Error Handling', () => {
		it('should error if params is not an object', () => {
			expect(() => {
				new Extension('123');
			}).to.throw(TypeError, 'Expected parameters to be an object or Context');

			expect(() => {
				new Extension(null);
			}).to.throw(TypeError, 'Expected parameters to be an object or Context');

			expect(() => {
				new Extension([]);
			}).to.throw(TypeError, 'Expected parameters to be an object or Context');
		});

		it('should error if extension path is invalid', () => {
			expect(() => {
				new Extension();
			}).to.throw(TypeError, 'Expected extension path to be a non-empty string');

			expect(() => {
				new Extension({});
			}).to.throw(TypeError, 'Expected extension path to be a non-empty string');

			expect(() => {
				new Extension({ extensionPath: null });
			}).to.throw(TypeError, 'Expected extension path to be a non-empty string');

			expect(() => {
				new Extension({ extensionPath: '' });
			}).to.throw(TypeError, 'Expected extension path to be a non-empty string');

			expect(() => {
				new Extension({ extensionPath: {} });
			}).to.throw(TypeError, 'Expected extension path to be a non-empty string');

			expect(() => {
				new Extension({ extensionPath: tmpDir });
			}).to.throw(TypeError, 'Expected extension path to be a non-empty string');
		});
	});

	describe('Executable Extensions', () => {
		it('should wire up extension that is a native binary', function () {
			this.slow(9000);
			this.timeout(10000);

			const env = { ...process.env };
			delete env.SNOOPLOGG;

			const { status, stdout, stderr } = spawnSync(process.execPath, [
				path.join(__dirname, 'examples', 'external-binary', 'extbin.js'), 'ping'
			], { env });
			expect(status).to.equal(0);
			expect(stdout.toString().trim() + stderr.toString().trim()).to.match(/usage: ping/im);
		});
	});

	describe('cli-kit Node Extensions', () => {
		it('should load and merge a cli-kit Node package', async () => {
			const extension = new Extension({
				extensionPath: path.join(__dirname, 'fixtures', 'cli-kit-ext')
			});
			expect(extension.name).to.equal('cli-kit-extension');

			let output = await runCLI(extension, []);

			// console.log(output);

			expect(output).to.equal([
				'USAGE: test-cli <command> [options]',
				'',
				'COMMANDS:',
				'  cli-kit-extension',
				'',
				'GLOBAL OPTIONS:',
				'  -h,--help  displays the help screen',
				'',
				''
			].join('\n'));

			output = await runCLI(extension, [ 'cli-kit-extension', '--help' ]);

			// console.log(output);

			expect(output).to.equal([
				'USAGE: test-cli cli-kit-extension <command> [options] [<foo>] [<bar>]',
				'',
				'CLI-KIT-EXTENSION COMMANDS:',
				'  stuff  perform magic',
				'',
				'CLI-KIT-EXTENSION ARGUMENTS:',
				'  foo  the first arg',
				'  bar',
				'',
				'CLI-KIT-EXTENSION OPTIONS:',
				'  -a,--append',
				'  --baz=<value>  set baz',
				'  --no-color  disable colors',
				'',
				'GLOBAL OPTIONS:',
				'  -h,--help  displays the help screen',
				'',
				''
			].join('\n'));
		});
	});

	describe('JavaScript Extensions', () => {
		it('should run a JavaScript file', function () {
			this.slow(9000);
			this.timeout(10000);

			const env = { ...process.env };
			delete env.SNOOPLOGG;

			const { status, stdout, stderr } = spawnSync(process.execPath, [
				path.join(__dirname, 'examples', 'external-js-file', 'extjsfile.js'), 'simple_js', 'foo', 'bar'
			], { env });
			expect(status).to.equal(0);
			expect(stdout.toString().trim() + stderr.toString().trim()).to.equal(`${process.version} foo bar`);
		});

		it('should run a simple Node.js module', function () {
			this.slow(9000);
			this.timeout(10000);

			const env = { ...process.env };
			delete env.SNOOPLOGG;

			const { status, stdout, stderr } = spawnSync(process.execPath, [
				path.join(__dirname, 'examples', 'external-module', 'extmod.js'), 'foo', 'bar'
			], { env });
			expect(status).to.equal(0);
			expect(stdout.toString().trim() + stderr.toString().trim()).to.equal(`${process.version} bar`);
		});
	});

	describe('Invalid Extensions', () => {
		it('should error if extension is not found', () => {
			const extensionPath = path.join(__dirname, 'does_not_exist');
			expect(() => {
				new Extension({ extensionPath });
			}).to.throw(Error, `Extension not found: ${extensionPath}`);
		});

		it('should ignore missing extensions', async () => {
			const extensionPath = path.join(__dirname, 'does_not_exist');
			const extension = new Extension({
				ignoreMissingExtensions: true,
				name: 'foo',
				extensionPath
			});
			expect(extension.name).to.equal('foo');

			const output = await runCLI(extension, [ 'foo' ]);
			expect(output.replace(/\x1B\[\d+m/g, '')).to.equal(`Extension not found: ${extensionPath}\n`);
		});

		it('should fail if extension does not have a main file', async () => {
			const extensionPath = path.join(__dirname, 'fixtures', 'no-main');
			expect(() => {
				new Extension({ extensionPath });
			}).to.throw(Error, `Unable to find extension's main file: ${extensionPath}`);
		});

		it('should ignore a cli-kit extension that has bad syntax', async () => {
			const extensionPath = path.join(__dirname, 'fixtures', 'bad-cli-kit-ext');
			const extension = new Extension({
				extensionPath,
				ignoreInvalidExtensions: true
			});

			let output = await runCLI(extension, []);
			expect(output).to.equal([
				'USAGE: test-cli <command> [options]',
				'',
				'COMMANDS:',
				'  bad-cli-kit-extension',
				'',
				'GLOBAL OPTIONS:',
				'  -h,--help  displays the help screen',
				'',
				''
			].join('\n'));

			output = await runCLI(extension, [ 'bad-cli-kit-extension' ]);

			expect(output).to.equal([
				'Bad extension: bad-cli-kit-extension',
				'  SyntaxError: Unexpected token )',
				`  ${path.join(extensionPath, 'main.js')}:3`,
				'  });',
				'   ^',
				''
			].join('\n'));
		});

		it('should error if a cli-kit extension that has bad syntax', () => {
			const extensionPath = path.join(__dirname, 'fixtures', 'bad-cli-kit-ext');

			expectThrow(() => {
				new Extension({
					extensionPath
				});
			}, {
				type:  Error,
				msg:   'Bad extension "bad-cli-kit-extension": Unexpected token )',
				code:  'ERR_INVALID_EXTENSION',
				name:  'SyntaxError',
				scope: 'Extension.constructor',
				extensionPath
			});
		});
	});
});

async function runCLI(extension, argv, noHelp) {
	const out = new WritableStream();

	const cli = new CLI({
		colors: false,
		extensions: [ extension ],
		help: !noHelp,
		name: 'test-cli',
		renderOpts: {
			markdown: false
		},
		terminal: new Terminal({
			stdout: out,
			stderr: out
		})
	});

	await cli.exec(argv);

	return out.toString();
}
