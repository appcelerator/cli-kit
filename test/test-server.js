import CLI, { Terminal } from '../dist/index';

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

			await CLI.connect('ws://localhost:1337', { terminal });
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

			await CLI.connect('ws://localhost:1337', { terminal });
			stdin.write('foo there\n');

			await new Promise(resolve => setTimeout(resolve, 500));

			expect(out.toString().replace(/^\u001b7\u001b\[999C\u001b\[999B\u001b8/, '')).to.equal('foo there\r\nhi there\r\n');
		} finally {
			await new Promise(resolve => server.close(resolve));
		}
	});
});
