import CLI from '../dist/index';

describe('CLI', () => {
	describe('Error Handling', () => {
		it('should error if args is not an array', () => {
			return new CLI()
				.exec('foo')
				.then(() => {
					throw new Error('Expected an error');
				}, err => {
					expect(err).to.be.instanceof(TypeError);
					expect(err.message).to.equal('Expected arguments to be an array');
				});
		});
	});

	describe('Parsing', () => {
		describe('Data Type Coercion', () => {
			it('should coerce bool type', async () => {
				let results = await new CLI({
					options: {
						'--foo <value>': {
							type: 'bool'
						}
					}
				}).exec([ '--foo', 'true' ]);
				expect(results.argv.foo).to.equal(true);

				results = await new CLI({
					options: {
						'--foo <value>': {
							type: 'bool'
						}
					}
				}).exec([ '--foo', 'false' ]);
				expect(results.argv.foo).to.equal(false);

				results = await new CLI({
					options: {
						'--foo <value>': {}
					}
				}).exec([ '--foo', 'true' ]);
				expect(results.argv.foo).to.equal('true');

				results = await new CLI({
					options: {
						'--foo': {}
					}
				}).exec([ '--foo' ]);
				expect(results.argv.foo).to.equal(true);
			});
		});
	});
});
