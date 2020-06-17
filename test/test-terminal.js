import Terminal from '../dist/terminal';
import crypto from 'crypto';

import { WritableStream } from 'memory-streams';

describe('Terminal', () => {
	describe('Constructor', () => {
		it('should error if default columns is invalid', () => {
			expect(() => {
				new Terminal({
					defaultColumns: 'foo'
				});
			}).to.throw(TypeError, 'Expected default columns to be a positive integer');

			expect(() => {
				new Terminal({
					defaultColumns: parseInt('')
				});
			}).to.throw(TypeError, 'Expected default columns to be a positive integer');

			expect(() => {
				new Terminal({
					defaultColumns: -123
				});
			}).to.throw(TypeError, 'Expected default columns to be a positive integer');
		});

		it('should error if default rows is invalid', () => {
			expect(() => {
				new Terminal({
					defaultRows: 'foo'
				});
			}).to.throw(TypeError, 'Expected default rows to be a positive integer');

			expect(() => {
				new Terminal({
					defaultRows: parseInt('')
				});
			}).to.throw(TypeError, 'Expected default rows to be a positive integer');

			expect(() => {
				new Terminal({
					defaultRows: -123
				});
			}).to.throw(TypeError, 'Expected default rows to be a positive integer');
		});

		it('should error if streams are invalid', () => {
			expect(() => {
				new Terminal({
					stdin: 'foo'
				});
			}).to.throw(TypeError, 'Expected the stdin stream to be a readable stream');

			expect(() => {
				new Terminal({
					stdout: 'foo'
				});
			}).to.throw(TypeError, 'Expected the stdout stream to be a writable stream');

			expect(() => {
				new Terminal({
					stderr: {}
				});
			}).to.throw(TypeError, 'Expected the stderr stream to be a writable stream');
		});

		it('should error if prompt timeout is invalid', () => {
			expect(() => {
				new Terminal({
					promptTimeout: 'foo'
				});
			}).to.throw(TypeError, 'Expected prompt timeout to be a positive integer');

			expect(() => {
				new Terminal({
					promptTimeout: -123
				});
			}).to.throw(TypeError, 'Expected prompt timeout to be a positive integer');
		});
	});

	describe('Banner', () => {
		describe('Text', () => {
			it('should display the banner on stdout', () => {
				const stderr = new WritableStream();
				const stdout = new WritableStream();
				const { console } = new Terminal({
					stderr,
					stdout
				}).onOutput(() => {
					stdout.write('foo\n\n');
				});

				console.log('a');
				console.error('b');
				console.log('c');
				console.error('d');

				expect(stdout.toString()).to.equal('foo\n\na\nc\n');
				expect(stderr.toString()).to.equal('b\nd\n');
			});

			it('should display the banner on stderr', () => {
				const stderr = new WritableStream();
				const stdout = new WritableStream();
				const { console } = new Terminal({
					stderr,
					stdout
				}).onOutput(() => {
					stderr.write('foo\n\n');
				});

				console.error('a');
				console.log('b');
				console.error('c');
				console.log('d');

				expect(stderr.toString()).to.equal('foo\n\na\nc\n');
				expect(stdout.toString()).to.equal('b\nd\n');
			});
		});

		describe('Data', () => {
			it('should passthrough XML', () => {
				const stdout = new WritableStream();
				const { console } = new Terminal({
					stdout
				}).onOutput(() => {
					stdout.write('foo\n\n');
				});

				console.log('<data>');
				expect(stdout.toString()).to.equal('<data>\n');
			});

			it('should passthrough XML with leading whitespace', () => {
				const stdout = new WritableStream();
				const { console } = new Terminal({
					stdout
				}).onOutput(() => {
					stdout.write('foo\n\n');
				});

				console.log('  <data>');
				expect(stdout.toString()).to.equal('  <data>\n');
			});

			it('should passthrough JSON', () => {
				const stdout = new WritableStream();
				const { console } = new Terminal({
					stdout
				}).onOutput(() => {
					stdout.write('foo\n\n');
				});

				console.log('{"foo":"bar"}');
				expect(stdout.toString()).to.equal('{"foo":"bar"}\n');
			});

			it('should passthrough JSON with leading whitespace', () => {
				const stdout = new WritableStream();
				const { console } = new Terminal({
					stdout
				}).onOutput(() => {
					stdout.write('foo\n\n');
				});

				console.log('  {"foo":"bar"}');
				expect(stdout.toString()).to.equal('  {"foo":"bar"}\n');
			});
		});

		describe('Encodings', () => {
			it('should passthrough non-text encodings', () => {
				const hash = crypto.createHash('sha256').update('foo').digest('hex');
				const stdout = new WritableStream();
				const callback = sinon.fake();
				const { console } = new Terminal({
					stdout
				}).onOutput(callback);

				stdout.write(hash, 'hex');

				expect(callback).to.not.be.called;
				expect(stdout.toBuffer().toString('hex')).to.equal(hash);
			});
		});
	});
});
