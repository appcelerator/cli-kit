import CLI, { ansi, Terminal } from '../dist/index';

import { PassThrough } from 'stream';
import { WritableStream } from 'memory-streams';

describe('Server', () => {
	it('should connect and run a command', async function () {
		this.timeout(4000);
		this.slow(3000);

		const cli = new CLI({
			help: true,
			commands: {
				abc({ console }) {
					console.log('bar!');
				}
			}
		});

		const server = await cli.listen({ port: 1337 });
		try {
			const out = new WritableStream();
			const stdin = new PassThrough();
			const terminal = new Terminal({
				stdout: out,
				stderr: out,
				stdin
			});

			const { send } = await CLI.connect('ws://localhost:1337', { terminal });
			send(ansi.custom.echo(true));

			stdin.write('abc\n');

			await new Promise(resolve => setTimeout(resolve, 500));

			expect(out.toString().replace(/^\u001b7\u001b\[999C\u001b\[999B\u001b8/, '')).to.equal('abc\r\nbar!\r\n');
		} finally {
			await new Promise(resolve => server.close(resolve));
		}
	});

	it('should connect and run an extension', async function () {
		this.timeout(4000);
		this.slow(3000);

		const cli = new CLI({
			help: true,
			extensions: {
				foo: 'echo "hi"'
			}
		});

		const server = await cli.listen({ port: 1337 });
		try {
			const out = new WritableStream();
			const stdin = new PassThrough();
			const terminal = new Terminal({
				stdout: out,
				stderr: out,
				stdin
			});

			const { send } = await CLI.connect('ws://localhost:1337', { terminal });
			send(ansi.custom.echo(true));

			stdin.write('foo there\n');

			await new Promise(resolve => setTimeout(resolve, 500));

			expect(out.toString().replace(/^\u001b7\u001b\[999C\u001b\[999B\u001b8/, '')).to.equal('foo there\r\nhi there\r\n');
		} finally {
			await new Promise(resolve => server.close(resolve));
		}
	});

	it('should error if connect url is invalid', async () => {
		await expect(CLI.connect()).to.be.rejectedWith(TypeError, 'Expected URL to be a string');
		await expect(CLI.connect(null)).to.be.rejectedWith(TypeError, 'Expected URL to be a string');
		await expect(CLI.connect('')).to.be.rejectedWith(TypeError, 'Expected URL to be a string');
	});

	it('should error if connect options are invalid', async () => {
		await expect(CLI.connect('foo', 'bar')).to.be.rejectedWith(TypeError, 'Expected options to be an object');
		await expect(CLI.connect('foo', 123)).to.be.rejectedWith(TypeError, 'Expected options to be an object');
		await expect(CLI.connect('foo', null)).to.be.rejectedWith(TypeError, 'Expected options to be an object');
	});

	it('should error if connect terminal option is invalid', async () => {
		await expect(CLI.connect('foo', { terminal: 'bar' })).to.be.rejectedWith(TypeError, 'Expected terminal to be a Terminal instance');
		await expect(CLI.connect('foo', { terminal: {} })).to.be.rejectedWith(TypeError, 'Expected terminal to be a Terminal instance');
	});

	it('should error if listen options are invalid', async () => {
		const cli = new CLI();
		await expect(cli.listen('foo')).to.be.rejectedWith(TypeError, 'Expected options to be an object');
		await expect(cli.listen(null)).to.be.rejectedWith(TypeError, 'Expected options to be an object');
	});

	it('should error if listen port is invalid', async () => {
		const cli = new CLI();
		await expect(cli.listen({ port: 'foo' })).to.be.rejectedWith(TypeError, 'Expected port to be a number between 1 and 65535');
		await expect(cli.listen({ port: null })).to.be.rejectedWith(TypeError, 'Expected port to be a number between 1 and 65535');
	});

	it('should error if port is already in use', async function () {
		this.timeout(4000);
		this.slow(3000);

		const cli = new CLI();

		const server1 = await cli.listen({ port: 1337 });
		let server2;

		try {
			server2 = await cli.listen({ port: 1337 });
		} catch (e) {
			expect(e).to.be.instanceof(Error);
			expect(e.code).to.equal('EADDRINUSE');
			return;
		} finally {
			await new Promise(resolve => server1.close(resolve));
			if (server2) {
				await new Promise(resolve => server2.close(resolve));
			}
		}

		throw new Error('Expected error');
	});
});
