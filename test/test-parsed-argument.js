import ParsedArgument from '../dist/parsed-argument';

describe('Parsed Argument', () => {
	describe('Constructor', () => {
		it('should error if type is not valid', () => {
			expect(() => {
				new ParsedArgument();
			}).to.throw(TypeError, 'Expected parsed argument type to be a non-empty string');

			expect(() => {
				new ParsedArgument(123);
			}).to.throw(TypeError, 'Expected parsed argument type to be a non-empty string');

			expect(() => {
				new ParsedArgument('');
			}).to.throw(TypeError, 'Expected parsed argument type to be a non-empty string');
		});

		it('should error if data is not valid', () => {
			expect(() => {
				new ParsedArgument('foo', 123);
			}).to.throw(TypeError, 'Expected parsed argument data to be an object');

			expect(() => {
				new ParsedArgument('foo', 'bar');
			}).to.throw(TypeError, 'Expected parsed argument data to be an object');
		});
	});

	describe('toString()', () => {
		it('should render a parsed command', () => {
			const p = new ParsedArgument('command', { command: { name: 'foo' } });
			expect(p.toString()).to.equal('[parsed command: foo]');
		});

		it('should render a parsed option', () => {
			const p = new ParsedArgument('option', { option: { name: 'foo' } });
			expect(p.toString()).to.equal('[parsed option: foo]');
		});

		it('should render a parsed argument', () => {
			const p = new ParsedArgument('blah', { value: 'foo' });
			expect(p.toString()).to.equal('[parsed blah: foo]');
		});
	});
});
