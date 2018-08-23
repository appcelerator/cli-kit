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

		it('should error if width is invalid', () => {
			expect(() => {
				new OutputStream({ width: 'foo' });
			}).to.throw(TypeError, 'Expected width to be a number');

			expect(() => {
				new OutputStream({ width: null });
			}).to.throw(TypeError, 'Expected width to be a number');

			expect(() => {
				new OutputStream({ width: -123 });
			}).to.throw(RangeError, 'Width must be a positive number');
		});
	});

	describe('Plain Strings', () => {
		it('should passthrough a plain string', () => {
			const callback = sinon.fake();

			const out = new OutputStream();
			out.on('start', callback);

			const result = new WritableStream();
			out.pipe(result);

			out.write('foo');

			expect(callback).to.have.been.calledOnce;
			expect(result.toString()).to.equal('foo');
		});

		it('should passthrough multiple plain strings', () => {
			const callback = sinon.fake();

			const out = new OutputStream();
			out.on('start', callback);

			const result = new WritableStream();
			out.pipe(result);

			out.write('foo');
			out.write('bar');
			out.write('baz');

			expect(callback).to.have.been.calledOnce;
			expect(result.toString()).to.equal('foobarbaz');
		});

		it('should passthrough markdown strings when markdown off', () => {
			const callback = sinon.fake();

			const out = new OutputStream();
			out.on('start', callback);

			const result = new WritableStream();
			out.pipe(result);

			out.write('# foo');

			expect(callback).to.have.been.calledOnce;
			expect(result.toString()).to.equal('# foo');
		});
	});
});
