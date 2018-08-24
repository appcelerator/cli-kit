import crypto from 'crypto';
import OutputStream from '../dist/render/output-stream';

import { WritableStream } from 'memory-streams';

describe('Output Stream', () => {
	describe('Constructor', () => {
		it('should error if options is invalid', () => {
			expect(() => {
				new OutputStream('foo');
			}).to.throw(TypeError, 'Expected options to be an object');

			expect(() => {
				new OutputStream(null);
			}).to.throw(TypeError, 'Expected options to be an object');
		});
	});

	describe('Plain Strings', () => {
		it('should passthrough a plain string', () => {
			const callback = sinon.fake();
			const out = new OutputStream();
			const result = new WritableStream();

			out.on('start', callback);
			out.pipe(result);
			out.end('foo');

			expect(callback).to.have.been.calledOnce;
			expect(result.toString()).to.equal('foo');
		});

		it('should passthrough multiple plain strings', () => {
			const out = new OutputStream();
			const result = new WritableStream();

			out.pipe(result);
			out.write('foo');
			out.write('bar');
			out.end('baz');

			expect(result.toString()).to.equal('foobarbaz');
		});

		it('should passthrough markdown strings when markdown off', () => {
			const out = new OutputStream();
			const result = new WritableStream();
			out.pipe(result);

			out.end('# foo');

			expect(result.toString()).to.equal('# foo');
		});
	});

	describe('Data', () => {
		it('should passthrough XML', () => {
			const out = new OutputStream();
			const result = new WritableStream();

			out.pipe(result);
			out.write('<data>');

			expect(result.toString()).to.equal('<data>');
		});

		it('should passthrough XML with leading whitespace', () => {
			const out = new OutputStream();
			const result = new WritableStream();

			out.pipe(result);
			out.write('  <data>');

			expect(result.toString()).to.equal('  <data>');
		});

		it('should passthrough JSON', () => {
			const out = new OutputStream();
			const result = new WritableStream();

			out.pipe(result);
			out.write('{"foo":"bar"}');

			expect(result.toString()).to.equal('{"foo":"bar"}');
		});

		it('should passthrough JSON with leading whitespace', () => {
			const out = new OutputStream();
			const result = new WritableStream();

			out.pipe(result);
			out.write('  {"foo":"bar"}');

			expect(result.toString()).to.equal('  {"foo":"bar"}');
		});
	});

	describe('Encodings', () => {
		it('should passthrough non-text encodings', () => {
			const hash = crypto.createHash('sha256').update('foo').digest('hex');
			const out = new OutputStream();
			const result = new WritableStream();

			out.pipe(result);
			out.write(hash, 'hex');

			expect(result.toBuffer().toString('hex')).to.equal(hash);
		});
	});

	describe('Markdown', () => {
		it('should error if width is invalid', () => {
			expect(() => {
				new OutputStream({ markdown: { width: 'foo' } });
			}).to.throw(TypeError, 'Expected width to be a number');

			expect(() => {
				new OutputStream({ markdown: { width: null } });
			}).to.throw(TypeError, 'Expected width to be a number');

			expect(() => {
				new OutputStream({ markdown: { width: -123 } });
			}).to.throw(RangeError, 'Width must be a positive number');
		});

		it('should render non-markdown string', () => {
			const out = new OutputStream({ markdown: true });
			const result = new WritableStream();

			out.pipe(result);
			out.end('foo');

			expect(result.toString()).to.equal('\u001b[0mfoo\u001b[0m\n\n');
		});

		it('should render a heading', () => {
			const out = new OutputStream({ markdown: true });
			const result = new WritableStream();

			out.pipe(result);
			out.end('# foo');

			expect(result.toString()).to.equal('\u001b[35m\u001b[4m\u001b[1m# foo\u001b[22m\u001b[24m\u001b[39m\n\n');
		});
	});
});
