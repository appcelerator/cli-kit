import Banner, { OutputStream } from '../dist/render/banner';
import crypto from 'crypto';

import { WritableStream } from 'memory-streams';

describe('Banner', () => {
	it('should display the banner on stdout', () => {
		const stderr = new WritableStream();
		const stdout = new WritableStream();
		const banner = new Banner({
			banner: 'foo',
			stderr,
			stdout
		});

		banner.stdout.write('a\n');
		banner.stderr.write('b\n');
		banner.stdout.write('c\n');
		banner.stderr.write('d\n');
		banner.stdout.end();
		banner.stderr.end();

		expect(stdout.toString()).to.equal('foo\n\na\nc\n');
		expect(stderr.toString()).to.equal('b\nd\n');
	});

	it('should display the banner on stderr', () => {
		const stderr = new WritableStream();
		const stdout = new WritableStream();
		const banner = new Banner({
			banner: 'foo',
			stderr,
			stdout
		});

		banner.stderr.write('a\n');
		banner.stdout.write('b\n');
		banner.stderr.write('c\n');
		banner.stdout.write('d\n');
		banner.stdout.end();
		banner.stderr.end();

		expect(stderr.toString()).to.equal('foo\n\na\nc\n');
		expect(stdout.toString()).to.equal('b\nd\n');
	});
});

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

		it('should error if banner is invalid', () => {
			expect(() => {
				new OutputStream({
					banner: 'foo'
				});
			}).to.throw(TypeError, 'Expected banner to be a Banner object');
		});
	});

	describe('Plain Strings', () => {
		it('should passthrough a plain string', () => {
			const out = new OutputStream();
			const result = new WritableStream();

			out.pipe(result);
			out.end('foo');

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
});
