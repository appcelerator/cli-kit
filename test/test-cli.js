import CLI from '../dist/index';

describe('CLI', () => {
	it('should error if args is not an array', () => {
		return new CLI()
			.exec('foo')
			.then(() => {
				throw new Error('Expected an error');
			}, err => {
				expect(err).to.be.instanceof(TypeError);
				expect(err.message).to.equal('Expected args to be an array');
			});
	});
});
