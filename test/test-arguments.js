import Arguments from '../dist/arguments';
import CLI from '../dist/index';

describe('Arguments', () => {
	describe('Constructor', () => {
		it('should error if args is not an array', () => {
			expect(() => {
				new Arguments(123);
			}).to.throw(TypeError, 'Expected args to be an array');

			expect(() => {
				new Arguments('foo');
			}).to.throw(TypeError, 'Expected args to be an array');

			expect(() => {
				new Arguments({});
			}).to.throw(TypeError, 'Expected args to be an array');
		});
	});

	describe('Serialization', () => {
		it('should recreate original arguments', async () => {
			const args = [ 'foo', 'bar', '--do-stuff' ];
			const cli = new CLI();
			const $args = await cli.exec(args);
			expect($args._).to.deep.equal(args);
			expect($args.valueOf()).to.deep.equal(args);
		});

		it('should serialize args to a string', async () => {
			const args = [ 'foo', 'bar', '--do-stuff' ];
			const cli = new CLI();
			const $args = await cli.exec(args);
			expect($args._).to.deep.equal(args);
			expect($args.toString()).to.equal('foo bar --do-stuff');
		});
	});
});
