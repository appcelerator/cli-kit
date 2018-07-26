import Option from '../dist/option';

describe('Option', () => {
	describe('Constructor', () => {
		it('should throw exception if format is not specified', () => {
			expect(() => {
				new Option;
			}).to.throw(TypeError, 'Expected option format to be a non-empty string');
		});

		it('should throw exception if format is not a string', () => {
			expect(() => {
				new Option({});
			}).to.throw(TypeError, 'Expected option format to be a non-empty string');
		});

		it('should throw exception if params is not an object', () => {
			expect(() => {
				new Option('-v', 'foo');
			}).to.throw(TypeError, 'Expected params to be an object');
		});
	});

	describe('Parsing', () => {
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
			}).to.throw(TypeError, 'Expected option format to be a non-empty string');
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
	});

	describe('Parameters', () => {
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

	describe('Aliases', () => {
		it('should throw exception if alias is not an array of strings or object', () => {
			expect(() => {
				new Option('--foo', {
					aliases: 123
				});
			}).to.throw(TypeError, 'Expected aliases to be a string or an array of strings');

			expect(() => {
				new Option('--foo', {
					aliases: [ 123 ]
				});
			}).to.throw(TypeError, 'Expected aliases to be a string or an array of strings');

			expect(() => {
				new Option('--foo', {
					aliases: [ '' ]
				});
			}).to.throw(TypeError, 'Expected aliases to be a string or an array of strings');
		});

		it('should init list of aliases', () => {
			expect(() => {
				new Option('--foo', {
					aliases: 'nodash'
				});
			}).to.throw(TypeError, 'Invalid alias format "nodash"');
		});

		it('should init visible short alias', () => {
			const opt = new Option('--foo', {
				aliases: '-f'
			});

			expect(opt.aliases).to.deep.equal({
				long: {},
				short: {
					'f': true
				}
			});
		});

		it('should init hidden short alias', () => {
			const opt = new Option('--foo', {
				aliases: '!-f'
			});

			expect(opt.aliases).to.deep.equal({
				long: {},
				short: {
					'f': false
				}
			});
		});

		it('should init visible long alias', () => {
			const opt = new Option('--foo', {
				aliases: '--fooo'
			});

			expect(opt.aliases).to.deep.equal({
				long: {
					'fooo': true
				},
				short: {}
			});
		});

		it('should init hidden long alias', () => {
			const opt = new Option('--foo', {
				aliases: '!--fooo'
			});

			expect(opt.aliases).to.deep.equal({
				long: {
					'fooo': false
				},
				short: {}
			});
		});

		it('should init single string of short and long aliases', () => {
			const opt = new Option('--foo', {
				aliases: '-a !-b -c, !-d, --fooo --foooo !--bar !--barr'
			});

			expect(opt.aliases).to.deep.equal({
				long: {
					fooo: true,
					foooo: true,
					bar: false,
					barr: false
				},
				short: {
					a: true,
					b: false,
					c: true,
					d: false
				}
			});
		});

		it('should init array of short and long aliases', () => {
			const opt = new Option('--foo', {
				aliases: [ '-a', '!-b', '-c', '!-d', '--fooo', '--foooo', '!--bar', '!--barr' ]
			});

			expect(opt.aliases).to.deep.equal({
				long: {
					fooo: true,
					foooo: true,
					bar: false,
					barr: false
				},
				short: {
					a: true,
					b: false,
					c: true,
					d: false
				}
			});
		});
	});
});
