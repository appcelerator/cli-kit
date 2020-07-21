/* eslint no-control-regex:0 */

import CLI, { ansi, Extension, Terminal } from '../dist/index';
import path from 'path';

import { spawnSync } from 'child_process';
import { WritableStream } from 'memory-streams';

describe('Extension', () => {
	describe('Error Handling', () => {
		it('should error if params is not an object', () => {
			expect(() => {
				new Extension(null);
			}).to.throw(TypeError, 'Expected an extension path or params object');

			expect(() => {
				new Extension([]);
			}).to.throw(TypeError, 'Expected an extension path or params object');
		});

		it('should error if extension path is invalid', () => {
			expect(() => {
				new Extension();
			}).to.throw(TypeError, 'Expected an extension path or params object');

			expect(() => {
				new Extension('');
			}).to.throw(TypeError, 'Expected an extension path or params object');

			expect(() => {
				new Extension({});
			}).to.throw(TypeError, 'Expected an extension path or params object');

			expect(() => {
				new Extension({ path: null });
			}).to.throw(TypeError, 'Expected an extension path or params object');

			expect(() => {
				new Extension({ path: '' });
			}).to.throw(TypeError, 'Expected an extension path or params object');

			expect(() => {
				new Extension({ path: {} });
			}).to.throw(Error, 'Expected an extension path or params object');
		});
	});

	describe('Executable Extensions', () => {
		it('should wire up extension that is a native binary', function () {
			this.slow(9000);
			this.timeout(10000);

			const env = { ...process.env };
			delete env.SNOOPLOGG;

			const { status, stdout, stderr } = spawnSync(process.execPath, [
				path.join(__dirname, 'examples', 'external-binary', 'extbin.js'),
				'ping'
			], { env });
			expect(status).to.equal(0);
			expect(stdout.toString().trim() + stderr.toString().trim()).to.match(/usage: ping/im);
		});

		it('should curry args to a native binary', function () {
			this.slow(9000);
			this.timeout(10000);

			const env = { ...process.env };
			delete env.SNOOPLOGG;

			const { status, stdout, stderr } = spawnSync(process.execPath, [
				path.join(__dirname, 'examples', 'run-node', 'run.js'), 'run', 'console.log(\'It works\')'
			], { env });
			expect(status).to.equal(0);
			expect(stdout.toString().trim() + stderr.toString().trim()).to.match(/It works/m);
		});

		it('should mixin user arguments each run', async () => {
			const out = new WritableStream();

			const cli = new CLI({
				colors: false,
				extensions: {
					echo: 'echo "hi"'
				},
				help: true,
				name: 'test-cli',
				terminal: new Terminal({
					stdout: out,
					stderr: out
				})
			});

			await cli.exec([ 'echo', 'foo' ]);
			expect(out.toString().trim()).to.equal('hi foo');

			out._writableState.buffer.length = 0;

			await cli.exec([ 'echo', 'bar' ]);
			expect(out.toString().trim()).to.equal('hi bar');
		});
	});

	describe('cli-kit Node Extensions', () => {
		it('should load and merge a cli-kit Node package', async () => {
			const extension = new Extension({
				path: path.join(__dirname, 'fixtures', 'cli-kit-ext')
			});
			expect(extension.name).to.equal('cli-kit-extension');

			let output = await runCLI(extension, []);

			// console.log(output);

			expect(ansi.strip(output)).to.equal([
				'USAGE: test-cli <command> [options]',
				'',
				'COMMANDS:',
				'  cli-kit-extension',
				'',
				'GLOBAL OPTIONS:',
				'  -h, --help  Displays the help screen',
				''
			].join('\n'));

			output = await runCLI(extension, [ 'cli-kit-extension', '--help' ]);

			// console.log(output);

			expect(ansi.strip(output)).to.equal([
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
				'Group 1:',
				'  --baz=<value>  set baz',
				'Group 2:',
				'  -a, --append',
				'  --no-color  Disable colors',
				'',
				'GLOBAL OPTIONS:',
				'  -h, --help  Displays the help screen',
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
				path.join(__dirname, 'examples', 'external-js-file', 'extjsfile.js'), 'simple', 'foo', 'bar'
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
		it('should ignore missing extensions', async () => {
			const extensionPath = path.join(__dirname, 'does_not_exist');
			const extension = new Extension({
				name: 'foo',
				path: extensionPath
			});
			expect(extension.name).to.equal('foo');

			const output = await runCLI(extension, [ 'foo' ]);
			const re = new RegExp(`Error: Invalid extension: Unable to find executable, script, or package: "${extensionPath.replace(/\\/g, '\\\\')}"`);
			expect(output.replace(/\x1B\[\d+m/g, '')).to.match(re);
		});

		// it('should error if a cli-kit extension that has bad syntax', () => {
		// 	const extensionPath = path.join(__dirname, 'fixtures', 'bad-cli-kit-ext');

		// 	expectThrow(() => {
		// 		new Extension({
		// 			path: extensionPath
		// 		});
		// 	}, {
		// 		type:  Error,
		// 		msg:   'Bad extension "bad-cli-kit-extension": Unexpected token )',
		// 		code:  'ERR_INVALID_EXTENSION',
		// 		name:  'SyntaxError',
		// 		scope: 'Extension.constructor',
		// 		extensionPath
		// 	});
		// });
	});
});

async function runCLI(extension, argv, params) {
	const out = new WritableStream();

	const cli = new CLI(Object.assign({
		colors: false,
		extensions: [ extension ],
		help: true,
		name: 'test-cli',
		terminal: new Terminal({
			stdout: out,
			stderr: out
		})
	}, params));

	await cli.exec(argv);

	return out.toString();
}
