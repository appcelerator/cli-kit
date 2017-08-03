import CLI from '../dist/index';

describe('CLI', () => {
	it('should error if args is not an array', done => {
		new CLI()
			.exec('foo')
			.then(() => {
				done(new Error('Expected an error'));
			})
			.catch(err => {
				expect(err).to.be.instanceof(TypeError);
				expect(err.message).to.equal('Expected args to be an array');
				done();
			})
			.catch(done);
	});
});
