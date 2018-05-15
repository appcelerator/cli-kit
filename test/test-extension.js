import CLI, { Extension } from '../dist/index';
import path from 'path';

import { tmpDir } from 'tmp';
import { WritableStream } from 'memory-streams';

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
		it('should wire up extension that is a native binary', async () => {
			const extension = new Extension({
				extensionPath: 'date'
			});
			expect(extension.name).to.equal('date');
			expect(extension.pkg).to.be.null;

			if (process.platform !== 'win32') {
				expect(extension.executable).to.equal('/bin/date');
			}

			const argv = process.platform === 'win32' ? [ 'date', '/T' ] : [ 'date', '+%a %m/%d/%y' ];
			const output = (await runCLI(extension, argv)).trim().split(' ')[1];

			const d = new Date();
			expect(output).to.equal(`${d.getMonth() < 9 ? '0' : ''}${d.getMonth() + 1}/${d.getDate() < 10 ? '0' : ''}${d.getDate()}/${String(d.getFullYear()).substring(2)}`);
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
				'Usage: test-cli <command> [options]',
				'',
				'Commands:',
				'  cli-kit-extension',
				'',
				'Global options:',
				'  -h, --help  displays the help screen',
				'',
				''
			].join('\n'));

			output = await runCLI(extension, [ 'cli-kit-extension', '--help' ]);

			// console.log(output);

			expect(output).to.equal([
				'Usage: test-cli cli-kit-extension <command> [options] [<foo>] [<bar>]',
				'',
				'Commands:',
				'  stuff  perform magic',
				'',
				'cli-kit-extension arguments:',
				'  foo  the first arg',
				'  bar',
				'',
				'cli-kit-extension options:',
				'  --baz=<value>  set baz',
				'  -a, --append',
				'',
				'Global options:',
				'  -h, --help  displays the help screen',
				'',
				''
			].join('\n'));
		});
	});

	describe('JavaScript Extensions', () => {
		it('should run a JavaScript file', async () => {
			const extension = new Extension({
				extensionPath: path.join(__dirname, 'fixtures', 'simple', 'simple.js')
			});
			expect(extension.name).to.equal('simple_js');

			const output = await runCLI(extension, [ 'simple_js', 'foo', 'bar' ]);
			expect(output).to.equal(`${process.version} foo bar\n`);
		});

		it('should run a simple Node.js module', async () => {
			const extension = new Extension({
				extensionPath: path.join(__dirname, 'fixtures', 'simple-module')
			});
			expect(extension.name).to.equal('foo');

			const output = await runCLI(extension, [ 'foo', 'bar' ]);
			expect(output).to.equal(`${process.version} bar\n`);
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
			expect(output).to.equal(`Extension not found: ${extensionPath}\n`);
		});

		it('should fail if extension does not have a main file', async () => {
			const extensionPath = path.join(__dirname, 'fixtures', 'no-main');
			expect(() => {
				new Extension({ extensionPath });
			}).to.throw(Error, `Unable to find extension's main file: ${extensionPath}`);
		});
	});
});

async function runCLI(extension, argv) {
	const out = new WritableStream();

	const cli = new CLI({
		extensions: [ extension ],
		help: true,
		name: 'test-cli',
		out
	});

	await cli.exec(argv);

	return out.toString();
}
