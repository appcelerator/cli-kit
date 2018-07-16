import CLI, { Argument } from '../dist/index';

import { WritableStream } from 'memory-streams';

describe('Argument', () => {
	describe('Constructor', () => {
		it('should error if argument params is invalid', () => {
			expect(() => {
				new CLI({
					args: [
						123
					]
				});
			}).to.throw(TypeError, 'Expected argument params to be a non-empty string or an object');

			expect(() => {
				new CLI({
					args: [
						[]
					]
				});
			}).to.throw(TypeError, 'Expected argument params to be a non-empty string or an object');

			expect(() => {
				new CLI({
					args: [
						''
					]
				});
			}).to.throw(TypeError, 'Expected argument params to be a non-empty string or an object');

			expect(() => {
				new CLI({
					args: [
						{}
					]
				});
			}).to.throw(TypeError, 'Expected argument name to be a non-empty string');

			expect(() => {
				new CLI({
					args: [
						{
							name: 123
						}
					]
				});
			}).to.throw(TypeError, 'Expected argument name to be a non-empty string');
		});

		it('should error if data type is unknown', () => {
			try {
				new Argument({
					name: 'foo',
					type: 'bar'
				});
			} catch (err) {
				expect(err).to.be.instanceof(Error);
				expect(err.message).to.equal('Unsupported type "bar"');
				expect(err.code).to.equal('ERR_INVALID_DATA_TYPE');
				expect(err.meta.value).to.equal('bar');
			}
		});

		it('should parse required sequence from argument name', () => {
			let arg = new Argument('foo');
			expect(arg.name).to.equal('foo');
			expect(arg.required).to.be.false;

			arg = new Argument('<foo>');
			expect(arg.name).to.equal('foo');
			expect(arg.required).to.be.true;

			arg = new Argument('[foo]');
			expect(arg.name).to.equal('foo');
			expect(arg.required).to.be.false;
		});

		it('should parse multiple sequence from argument name', () => {
			let arg = new Argument('foo...');
			expect(arg.name).to.equal('foo');
			expect(arg.multiple).to.be.true;

			arg = new Argument('<foo>...');
			expect(arg.name).to.equal('foo');
			expect(arg.multiple).to.be.true;

			arg = new Argument('[foo]...');
			expect(arg.name).to.equal('foo');
			expect(arg.multiple).to.be.true;

			arg = new Argument('foo...    ');
			expect(arg.name).to.equal('foo');
			expect(arg.multiple).to.be.true;
		});
	});

	describe('Help', () => {
		it('should show string argument in help', async () => {
			const out = new WritableStream();

			const cli = new CLI({
				args: [
					'foo'
				],
				colors: false,
				help: true,
				out
			});

			await cli.exec([ '--help' ]);

			expect(out.toString()).to.equal([
				'Usage: program [options] [<foo>]',
				'',
				'Global arguments:',
				'  foo',
				'',
				'Global options:',
				'  -h, --help  displays the help screen',
				'',
				''
			].join('\n'));
		});

		it('should show object argument in help', async () => {
			const out = new WritableStream();

			const cli = new CLI({
				args: [
					{
						name: 'foo',
						desc: 'enables foo mode',
						required: true
					}
				],
				colors: false,
				help: true,
				out
			});

			await cli.exec([ '--help' ]);

			expect(out.toString()).to.equal([
				'Usage: program [options] <foo>',
				'',
				'Global arguments:',
				'  foo  enables foo mode',
				'',
				'Global options:',
				'  -h, --help  displays the help screen',
				'',
				''
			].join('\n'));
		});
	});

	describe('Parsing', () => {
		it('should parse arguments', async () => {
			const cli = new CLI({
				args: [
					{
						name: 'foo',
						desc: 'enables foo mode'
					}
				],
				out: new WritableStream()
			});

			let results = await cli.exec([]);
			expect(results.argv.foo).to.be.undefined;
			expect(results._).to.deep.equal([]);

			results = await cli.exec([ 'bar' ]);
			expect(results.argv.foo).to.equal('bar');
			expect(results._).to.deep.equal([]);

			results = await cli.exec([ 'bar', 'baz' ]);
			expect(results.argv.foo).to.equal('bar');
			expect(results._).to.deep.equal([ 'baz' ]);
		});

		it('should error if required argument is missing', () => {
			const cli = new CLI({
				args: [
					{
						name: 'foo',
						desc: 'enables foo mode',
						required: true
					}
				],
				defaultCommand: null,
				out: new WritableStream()
			});

			return cli.exec([])
				.then(() => {
					throw new Error('Expected missing required argument error');
				}, err => {
					expect(err).to.be.instanceof(Error);
					expect(err.message).to.equal('Missing required argument "foo"');
					expect(err.code).to.equal('ERR_MISSING_REQUIRED_ARGUMENT');
					expect(err.meta).to.be.an('object');
				});
		});

		it('should error if value less than the min', () => {
			const cli = new CLI({
				args: [
					{
						name: 'foo',
						type: 'number',
						min: 10
					}
				],
				out: new WritableStream()
			});

			const result = cli.exec([ '4' ]);

			return expect(result).to.eventually.be.rejectedWith(Error, 'Value must be greater than or equal to 10');
		});

		it('should error if value more than the max', () => {
			const cli = new CLI({
				args: [
					{
						name: 'foo',
						type: 'number',
						max: 10
					}
				],
				out: new WritableStream()
			});

			const result = cli.exec([ '14' ]);

			return expect(result).to.eventually.be.rejectedWith(Error, 'Value must be less than or equal to 10');
		});

		it('should parse number between min and max', async () => {
			const cli = new CLI({
				args: [
					{
						name: 'foo',
						type: 'number',
						min: 5,
						max: 10
					}
				],
				out: new WritableStream()
			});

			const { argv } = await cli.exec([ '7' ]);
			expect(argv.foo).to.equal(7);
		});

		it('should coerce a value to a number', async () => {
			const cli = new CLI({
				args: [
					{
						name: 'foo',
						type: 'number'
					}
				],
				out: new WritableStream()
			});

			const { argv } = await cli.exec([ '3.14' ]);
			expect(argv.foo).to.equal(3.14);
		});
	});
});
