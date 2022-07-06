import CLI, { Terminal } from '../src/index.js';
import path from 'path';
import { expect } from 'chai';
import { fileURLToPath } from 'url';
import { WritableStream } from 'memory-streams';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('Actions', () => {
	it('should emit an action to extensions', async function () {
		this.slow(4000);
		this.timeout(5000);

		const out = new WritableStream();

		const cli = new CLI({
			extensions: [
				path.join(__dirname, 'fixtures', 'action-good')
			],
			terminal: new Terminal({
				stdout: out,
				stderr: out
			})
		});

		cli.on('test-action', data => {
			expect(data).to.deep.equal({ foo: 'bar' });
		});

		await cli.emitAction('test-action', { foo: 'bar' });

		expect(out.toString().trim()).to.equal('Hi from the action!');
	});

	it('should error if extension action is invalid', async function () {
		this.slow(4000);
		this.timeout(5000);

		const out = new WritableStream();

		const cli = new CLI({
			extensions: [
				path.join(__dirname, 'fixtures', 'action-bad')
			],
			terminal: new Terminal({
				stdout: out,
				stderr: out
			})
		});

		cli.on('test-action', data => {
			expect(data).to.deep.equal({ foo: 'bar' });
		});

		await cli.emitAction('test-action', { foo: 'bar' });

		expect(out.toString().trim()).to.equal('');
	});
});
