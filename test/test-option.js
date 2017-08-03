import Option from '../dist/option';

describe('Option', () => {

	it('should throw exception if format is not specified', () => {
		expect(() => {
			new Option;
		}).to.throw(TypeError, 'Expected format to be a string');
	});

	it('should throw exception if format is not a string', () => {
		expect(() => {
			new Option({});
		}).to.throw(TypeError, 'Expected format to be a string');
	});

	it('should throw exception if params is not an object', () => {
		expect(() => {
			new Option('-v', 'foo');
		}).to.throw(TypeError, 'Expected params to be an object');
	});

	it('should parse short option', () => {
		const opt = new Option('-v');
		expect(opt.short).to.equal('v');
	});

	it('should parse long option', () => {
		const opt = new Option('--verbose');
		expect(opt.long).to.equal('verbose');
	});

	it('should parse long option with dash', () => {
		const opt = new Option('--foo-bar');
		expect(opt.long).to.equal('foo-bar');
	});

	it('should parse comma separated short and long option', () => {
		const opt = new Option('-v, --verbose');
		expect(opt.short).to.equal('v');
		expect(opt.long).to.equal('verbose');
	});

	it('should parse space separated short and long option', () => {
		const opt = new Option('-v --verbose');
		expect(opt.short).to.equal('v');
		expect(opt.long).to.equal('verbose');
	});

	it('should parse pipe separated short and long option', () => {
		const opt = new Option('-v | --verbose');
		expect(opt.short).to.equal('v');
		expect(opt.long).to.equal('verbose');
	});

	it('should throw exception if format is empty', () => {
		expect(() => {
			new Option('');
		}).to.throw(TypeError, 'Invalid option format');
	});

	it('should throw exception if format is invalid', () => {
		expect(() => {
			new Option('-');
		}).to.throw(TypeError, 'Invalid option format');

		expect(() => {
			new Option('--');
		}).to.throw(TypeError, 'Invalid option format');

		expect(() => {
			new Option('foo');
		}).to.throw(TypeError, 'Invalid option format');
	});

	it('should parse short required option hint', () => {
		const opt = new Option('-p <name>');
		expect(opt.short).to.equal('p');
		expect(opt.hint).to.equal('name');
		expect(opt.required).to.be.true;
	});

	it('should parse long required option hint', () => {
		const opt = new Option('--platform <name>');
		expect(opt.long).to.equal('platform');
		expect(opt.hint).to.equal('name');
		expect(opt.required).to.be.true;
	});

	it('should parse short and long required option hint', () => {
		const opt = new Option('-p, --platform <name>');
		expect(opt.long).to.equal('platform');
		expect(opt.hint).to.equal('name');
		expect(opt.required).to.be.true;
	});

	it('should parse short optional option hint', () => {
		const opt = new Option('-p [name]');
		expect(opt.short).to.equal('p');
		expect(opt.hint).to.equal('name');
		expect(opt.required).to.be.false;
	});

	it('should parse long optional option hint', () => {
		const opt = new Option('--platform [name]');
		expect(opt.long).to.equal('platform');
		expect(opt.hint).to.equal('name');
		expect(opt.required).to.be.false;
	});

	it('should parse short and long optional option hint', () => {
		const opt = new Option('-p, --platform [name]');
		expect(opt.long).to.equal('platform');
		expect(opt.hint).to.equal('name');
		expect(opt.required).to.be.false;
	});

	it('should parse negated option', () => {
		const opt = new Option('--no-colors');
		expect(opt.long).to.equal('colors');
		expect(opt.negate).to.be.true;
	});

	it('should parse short and long negated option', () => {
		const opt = new Option('-c | --no-colors');
		expect(opt.long).to.equal('colors');
		expect(opt.negate).to.be.true;
	});
});
