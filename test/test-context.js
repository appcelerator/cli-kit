import Command from '../src/parser/command.js';
import Context from '../src/parser/context.js';
import Option from '../src/parser/option.js';
import Parser from '../src/parser/parser.js';
import path from 'path';
import { expect } from 'chai';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('Context', () => {
	describe('Constructor', () => {
		it('should error if passed an invalid cli-kit object', () => {
			const opt = new Option('--foo');

			expect(() => {
				new Context(opt);
			}).to.throw(TypeError, 'Expected parameters to be an object or Context');
		});

		it('should error if args is invalid', () => {
			expect(() => {
				new Context({
					args: 123
				});
			}).to.throw(TypeError, 'Expected argument params to be a non-empty string or an object');
		});

		it('should error if commands is invalid', () => {
			expect(() => {
				new Context({
					commands: 123
				});
			}).to.throw(TypeError, 'Invalid command "123", expected an object');
		});

		it('should error if commands path is invalid', () => {
			expect(() => {
				new Context({
					commands: 'does_not_exist'
				});
			}).to.throw(Error, `Command path does not exist: ${path.resolve('.', 'does_not_exist')}`);
		});

		it('should error if options is invalid', () => {
			expect(() => {
				new Context({
					options: 123
				});
			}).to.throw(TypeError, 'Expected option format to be a non-empty string');

			expect(() => {
				new Context({
					options: 'foo'
				});
			}).to.throw(TypeError, 'Invalid option format "foo"');
		});

		it('should error if extensions is invalid', () => {
			expect(() => {
				new Context({
					extensions: 123
				});
			}).to.throw(TypeError, 'Invalid extension "123", expected a valid path or an object');

			expect(() => {
				new Context({
					extensions: { path: '' }
				});
			}).to.throw(Error, 'Expected an extension path or params object');
		});
	});

	// describe('Parsing', () => {
	// 	it('should parse unknown "short boolean" as argument', async () => {
	// 		const ctx = new Context();
	// 		return ctx.parse([ '-b' ])
	// 			.then(({ argv, _ }) => {
	// 				expect(argv).to.deep.equal({});
	// 				expect(_).to.deep.equal([ '-b' ]);
	// 			});
	// 	});
	//
	// 	it('should parse unknown "short boolean" as option', async () => {
	// 		const ctx = new Context({ allowUnknownOptions: true });
	// 		return ctx.parse([ '-b' ])
	// 			.then(({ argv, _ }) => {
	// 				expect(argv).to.deep.equal({
	// 					b: true
	// 				});
	// 				expect(_).to.deep.equal([]);
	// 			});
	// 	});
	//
	// 	it('should parse known "short boolean" as flag', async () => {
	// 		const ctx = new Context({
	// 			options: {
	// 				'-b': {}
	// 			}
	// 		});
	// 		return ctx.parse([ '-b' ])
	// 			.then(({ argv, _ }) => {
	// 				expect(argv).to.deep.equal({
	// 					b: true
	// 				});
	// 				expect(_).to.deep.equal([]);
	// 			});
	// 	});
	//
	// 	it('should parse known "short boolean" as option', async () => {
	// 		const ctx = new Context({
	// 			options: {
	// 				'-b <value>': {}
	// 			}
	// 		});
	// 		return ctx.parse([ '-b', 'foo' ])
	// 			.then(({ argv, _ }) => {
	// 				expect(argv).to.deep.equal({
	// 					b: 'foo'
	// 				});
	// 				expect(_).to.deep.equal([]);
	// 			});
	// 	});
	//
	// 	it('should parse known "short boolean" as option with equal sign', async () => {
	// 		const ctx = new Context({
	// 			options: {
	// 				'-b <value>': {}
	// 			}
	// 		});
	// 		return ctx.parse([ '-b=foo' ])
	// 			.then(({ argv, _ }) => {
	// 				expect(argv).to.deep.equal({
	// 					b: 'foo'
	// 				});
	// 				expect(_).to.deep.equal([]);
	// 			});
	// 	});
	//
	// 	it('should parse and call command', async () => {
	// 		const ctx = new Context();
	//
	// 		ctx.command('test', {
	// 			options: {
	// 				'--data <json>': { type: 'json' },
	// 				'--log-file <file>':  { type: 'file' },
	// 				'--verbose': {}
	// 			},
	// 			action: cmd => {
	// 				//
	// 			}
	// 		});
	//
	// 		return ctx.parse([ 'test', '--data', '{"abc": 123}', '--log-file', 'zap.txt', '--verbose' ])
	// 			.then(parsed => {
	// 				expect(parsed).to.be.instanceof(Parser);
	//
	// 				expect(parsed.args).to.be.an.instanceof(Array);
	// 				expect(parsed.args).to.have.lengthOf(4);
	//
	// 				expect(parsed.args[0].type).to.equal('command');
	// 				expect(parsed.args[0].command).to.be.instanceof(Command);
	// 				expect(parsed.args[0].command.name).to.equal('test');
	//
	// 				expect(parsed.args[1].type).to.equal('option');
	// 				expect(parsed.args[1].option).to.be.instanceof(Option);
	// 				expect(parsed.args[1].option.name).to.equal('data');
	// 				expect(parsed.args[1].value).to.deep.equal({ abc: 123 });
	//
	// 				expect(parsed.args[2].type).to.equal('option');
	// 				expect(parsed.args[2].option).to.be.instanceof(Option);
	// 				expect(parsed.args[2].option.name).to.equal('log-file');
	// 				expect(parsed.args[2].value).to.equal('zap.txt');
	//
	// 				expect(parsed.args[3].type).to.equal('option');
	// 				expect(parsed.args[3].option).to.be.instanceof(Option);
	// 				expect(parsed.args[3].option.name).to.equal('verbose');
	// 				expect(parsed.args[3].value).to.be.true;
	// 			});
	// 	});
	// });

	// describe('Long Options', () => {
	// 	it('should ', done => {
	// 		const ctx = new Context({
	// 			options: [
	// 				{ short: 'f', long: 'foo' }
	// 			]
	// 		});
	// 		ctx.parse([ 'foo', 'bar', 'baz' ])
	// 			.then(results => {
	// 				expect(results._).to.deep.equal(['foo', 'bar', 'baz']);
	// 				done();
	// 			})
	// 			.catch(done);
	// 	});
	// });

	// describe('Arguments', () => {
	// 	it('should add arguments to _', done => {
	// 		const ctx = new Context;
	// 		ctx.parse([ 'foo', 'bar', 'baz' ])
	// 			.then(results => {
	// 				expect(results._).to.deep.equal(['foo', 'bar', 'baz']);
	// 				done();
	// 			})
	// 			.catch(done);
	// 	});
	// });
	//
	// describe('Short Options', () => {
	// 	it('should parse a short boolean', done => {
	// 		const ctx = new Context;
	// 		ctx.parse([ '-b' ])
	// 			.then(results => {
	// 				expect(results).to.have.property('b').to.be.ok.and.be.a.Boolean;
	// 				expect(results).to.have.property('_').with.lengthOf(0);
	// 				done();
	// 			})
	// 			.catch(done);
	// 	});
	// });
});

/*
it('should place bare options in the _ array', function () {
	var parse = parser('foo bar baz')
	parse.should.have.property('_').and.deep.equal(['foo', 'bar', 'baz'])
})

it('should set the value of the final option in a group to the next supplied value', function () {
	var parse = parser(['-cats', 'meow'])
	parse.should.have.property('c', true)
	parse.should.have.property('a', true)
	parse.should.have.property('t', true)
	parse.should.have.property('s', 'meow')
	parse.should.have.property('_').with.length(0)
})

it('should set the value of a single long option to the next supplied value', function () {
	var parse = parser(['--pow', 'xixxle'])
	parse.should.have.property('pow', 'xixxle')
	parse.should.have.property('_').with.length(0)
})

it('should set the value of a single long option to the next supplied value, even if the value is empty', function () {
	var parse = parser(['--pow', ''])
	parse.should.have.property('pow', '')
	parse.should.have.property('_').with.length(0)
})

it('should set the value of a single long option if an = was used', function () {
	var parse = parser(['--pow=xixxle'])
	parse.should.have.property('pow', 'xixxle')
	parse.should.have.property('_').with.length(0)
})

it('should set the value of multiple long options to the next supplied values relative to each', function () {
	var parse = parser(['--host', 'localhost', '--port', '555'])
	parse.should.have.property('host', 'localhost')
	parse.should.have.property('port', 555)
	parse.should.have.property('_').with.length(0)
})

it('should set the value of multiple long options if = signs were used', function () {
	var parse = parser(['--host=localhost', '--port=555'])
	parse.should.have.property('host', 'localhost')
	parse.should.have.property('port', 555)
	parse.should.have.property('_').with.length(0)
})

it('should still set values appropriately if a mix of short, long, and grouped short options are specified', function () {
	var parse = parser(['-h', 'localhost', '-fp', '555', 'script.js'])
	parse.should.have.property('f', true)
	parse.should.have.property('p', 555)
	parse.should.have.property('h', 'localhost')
	parse.should.have.property('_').and.deep.equal(['script.js'])
})

it('should still set values appropriately if a mix of short and long options are specified', function () {
	var parse = parser(['-h', 'localhost', '--port', '555'])
	parse.should.have.property('h', 'localhost')
	parse.should.have.property('port', 555)
	parse.should.have.property('_').with.length(0)
})

it('should explicitly set a boolean option to false if preceeded by "--no-"', function () {
	var parse = parser(['--no-moo'])
	parse.should.have.property('moo', false)
	parse.should.have.property('_').with.length(0)
})

it('should still set values appropriately if we supply a comprehensive list of various types of options', function () {
	var parse = parser([
	'--name=meowmers', 'bare', '-cats', 'woo',
	'-h', 'awesome', '--multi=quux',
	'--key', 'value',
	'-b', '--bool', '--no-meep', '--multi=baz',
	'--', '--not-a-flag', '-', '-h', '-multi', '--', 'eek'
	])
	parse.should.have.property('c', true)
	parse.should.have.property('a', true)
	parse.should.have.property('t', true)
	parse.should.have.property('s', 'woo')
	parse.should.have.property('h', 'awesome')
	parse.should.have.property('b', true)
	parse.should.have.property('bool', true)
	parse.should.have.property('key', 'value')
	parse.should.have.property('multi').and.deep.equal(['quux', 'baz'])
	parse.should.have.property('meep', false)
	parse.should.have.property('name', 'meowmers')
	parse.should.have.property('_').and.deep.equal(['bare', '--not-a-flag', '-', '-h', '-multi', '--', 'eek'])
})

it('should parse numbers appropriately', function () {
	var argv = parser([
	'-x', '1234',
	'-y', '5.67',
	'-z', '1e7',
	'-w', '10f',
	'--hex', '0xdeadbeef',
	'789'
	])
	argv.should.have.property('x', 1234).and.be.a('number')
	argv.should.have.property('y', 5.67).and.be.a('number')
	argv.should.have.property('z', 1e7).and.be.a('number')
	argv.should.have.property('w', '10f').and.be.a('string')
	argv.should.have.property('hex', 0xdeadbeef).and.be.a('number')
	argv.should.have.property('_').and.deep.equal([789])
	argv._[0].should.be.a('number')
})

// addresses: https://github.com/yargs/yargs-parser/issues/33
it('should handle parsing negative #s', function () {
	var argv = parser([
	'-33', '-177', '33',
	'--n1', '-33',
	'-n', '-44',
	'--n2=-55',
	'--foo.bar', '-33',
	'-o=-55',
	'--bounds', '-180', '99', '-180', '90',
	'--other', '-99', '-220'
	], {
	array: 'bounds',
	narg: {'other': 2}
	})

	argv._.should.deep.equal([-33, -177, 33])
	argv.n1.should.equal(-33)
	argv.n.should.equal(-44)
	argv.n2.should.equal(-55)
	argv.foo.bar.should.equal(-33)
	argv.o.should.equal(-55)
	argv.bounds.should.deep.equal([-180, 99, -180, 90])
	argv.other.should.deep.equal([-99, -220])
})

it('should set the value of a single short option to the next supplied value, even if the value is empty', function () {
	var parse = parser(['-p', ''])
	parse.should.have.property('p', '')
	parse.should.have.property('_').with.length(0)
})

it('should not set the next value as the value of a short option if that option is explicitly defined as a boolean', function () {
	var parse = parser([ '-t', 'moo' ], {
	boolean: 't'
	})
	parse.should.have.property('t', true).and.be.a('boolean')
	parse.should.have.property('_').and.deep.equal(['moo'])
})

it('should set boolean options values if the next value is "true" or "false"', function () {
	var parse = parser(['--verbose', 'false', 'moo', '-t', 'true'], {
	boolean: ['t', 'verbose'],
	default: {
		verbose: true
	}
	})
	parse.should.have.property('verbose', false).and.be.a('boolean')
	parse.should.have.property('t', true).and.be.a('boolean')
	parse.should.have.property('_').and.deep.equal(['moo'])
})

it('should not set boolean options values if the next value only contains the words "true" or "false"', function () {
	var parse = parser(['--verbose', 'aaatrueaaa', 'moo', '-t', 'aaafalseaaa'], {
	boolean: ['t', 'verbose']
	})
	parse.should.have.property('verbose', true).and.be.a('boolean')
	parse.should.have.property('t', true).and.be.a('boolean')
	parse.should.have.property('_').and.deep.equal(['aaatrueaaa', 'moo', 'aaafalseaaa'])
})

it('should allow defining options as boolean in groups', function () {
	var parse = parser([ '-x', '-z', 'one', 'two', 'three' ], {
	boolean: ['x', 'y', 'z']
	})
	parse.should.have.property('x', true).and.be.a('boolean')
	parse.should.have.property('y', false).and.be.a('boolean')
	parse.should.have.property('z', true).and.be.a('boolean')
	parse.should.have.property('_').and.deep.equal(['one', 'two', 'three'])
})

it('should preserve newlines in option values', function () {
	var args = parser(['-s', 'X\nX'])
	args.should.have.property('_').with.length(0)
	args.should.have.property('s', 'X\nX')
	// reproduce in bash:
	// VALUE="new
	// line"
	// node program.js --s="$VALUE"
	args = parser(['--s=X\nX'])
	args.should.have.property('_').with.length(0)
	args.should.have.property('s', 'X\nX')
})

it('should not convert numbers to type number if explicitly defined as strings', function () {
	var s = parser([ '-s', '0001234' ], {
	string: 's'
	}).s
	s.should.be.a('string').and.equal('0001234')
	var x = parser([ '-x', '56' ], {
	string: ['x']
	}).x
	x.should.be.a('string').and.equal('56')
})

it('should default numbers to undefined', function () {
	var n = parser([ '-n' ], {
	number: ['n']
	}).n
	expect(n).to.equal(undefined)
})

it('should default number to NaN if value is not a valid number', function () {
	var n = parser([ '-n', 'string' ], {
	number: ['n']
	}).n
	expect(n).to.deep.equal(NaN)
})

// Fixes: https://github.com/bcoe/yargs/issues/68
it('should parse flag arguments with no right-hand-value as strings, if defined as strings', function () {
	var s = parser([ '-s' ], {
	string: ['s']
	}).s
	s.should.be.a('string').and.equal('')

	s = parser([ '-sf' ], {
	string: ['s']
	}).s
	s.should.be.a('string').and.equal('')

	s = parser([ '--string' ], {
	string: ['string']
	}).string
	s.should.be.a('string').and.equal('')
})

it('should leave all non-hyphenated values as strings if _ is defined as a string', function () {
	var s = parser([ '  ', '  ' ], {
	string: ['_']
	})._
	s.should.have.length(2)
	s[0].should.be.a('string').and.equal('  ')
	s[1].should.be.a('string').and.equal('  ')
})

describe('normalize', function () {
	it('should normalize redundant paths', function () {
	var a = parser([ '-s', ['', 'tmp', '..', ''].join(path.sep) ], {
		alias: {
		s: ['save']
		},
		normalize: 's'
	})
	a.should.have.property('s', path.sep)
	a.should.have.property('save', path.sep)
	})

	it('should normalize redundant paths when a value is later assigned', function () {
	var a = parser(['-s'], {
		normalize: ['s']
	})
	a.should.have.property('s', true)
	a.s = ['', 'path', 'to', 'new', 'dir', '..', '..', ''].join(path.sep)
	a.s.should.equal(['', 'path', 'to', ''].join(path.sep))
	})

	it('should normalize when key is also an array', function () {
	var a = parser([ '-s', ['', 'tmp', '..', ''].join(path.sep), ['', 'path', 'to', 'new', 'dir', '..', '..', ''].join(path.sep) ], {
		alias: {
		s: ['save']
		},
		normalize: 's',
		array: 's'
	})
	var expected = [path.sep, ['', 'path', 'to', ''].join(path.sep)]
	a.should.have.property('s').and.deep.equal(expected)
	a.should.have.property('save').and.deep.equal(expected)
	})
})

describe('alias', function () {
	it('should set alias value to the same value as the full option', function () {
	var argv = parser([ '-f', '11', '--zoom', '55' ], {
		alias: {
		z: ['zoom']
		}
	})
	argv.should.have.property('zoom', 55)
	argv.should.have.property('z', 55)
	argv.should.have.property('f', 11)
	})

	it('should allow multiple aliases to be specified', function () {
	var argv = parser([ '-f', '11', '--zoom', '55' ], {
		alias: {
		z: ['zm', 'zoom']
		}
	})

	argv.should.have.property('zoom', 55)
	argv.should.have.property('z', 55)
	argv.should.have.property('zm', 55)
	argv.should.have.property('f', 11)
	})

	// regression, see https://github.com/chevex/yargs/issues/63
	it('should not add the same key to argv multiple times, when creating camel-case aliases', function () {
	var argv = parser(['--health-check=banana', '--second-key', 'apple', '-t=blarg'], {
		alias: {
		h: ['health-check'],
		'second-key': ['s'],
		'third-key': ['t']
		},
		default: {
		h: 'apple',
		'second-key': 'banana',
		'third-key': 'third'
		}
	})

	// before this fix, yargs failed parsing
	// one but not all forms of an arg.
	argv.secondKey.should.eql('apple')
	argv.s.should.eql('apple')
	argv['second-key'].should.eql('apple')

	argv.healthCheck.should.eql('banana')
	argv.h.should.eql('banana')
	argv['health-check'].should.eql('banana')

	argv.thirdKey.should.eql('blarg')
	argv.t.should.eql('blarg')
	argv['third-key'].should.eql('blarg')
	})

	it('should allow transitive aliases to be specified', function () {
	var argv = parser([ '-f', '11', '--zoom', '55' ], {
		alias: {
		z: 'zm',
		zm: 'zoom'
		}
	})

	argv.should.have.property('zoom', 55)
	argv.should.have.property('z', 55)
	argv.should.have.property('zm', 55)
	argv.should.have.property('f', 11)
	})

	it('should merge two lists of aliases if they collide', function () {
	var argv = parser(['-f', '11', '--zoom', '55'], {
		alias: {
		z: 'zm',
		zoom: 'zoop',
		zm: 'zoom'
		}
	})

	argv.should.have.property('zoom', 55)
	argv.should.have.property('zoop', 55)
	argv.should.have.property('z', 55)
	argv.should.have.property('zm', 55)
	argv.should.have.property('f', 11)
	})
})

it('should assign data after forward slash to the option before the slash', function () {
	var parse = parser(['-I/foo/bar/baz'])
	parse.should.have.property('_').with.length(0)
	parse.should.have.property('I', '/foo/bar/baz')
	parse = parser(['-xyz/foo/bar/baz'])
	parse.should.have.property('x', true)
	parse.should.have.property('y', true)
	parse.should.have.property('z', '/foo/bar/baz')
	parse.should.have.property('_').with.length(0)
})

describe('config', function () {
	var jsonPath = path.resolve(__dirname, './fixtures/config.json')

	// See: https://github.com/chevex/yargs/issues/12
	it('should load options and values from default config if specified', function () {
	var argv = parser([ '--foo', 'bar' ], {
		alias: {
		z: 'zoom'
		},
		default: {
		settings: jsonPath
		},
		config: 'settings'
	})

	argv.should.have.property('herp', 'derp')
	argv.should.have.property('zoom', 55)
	argv.should.have.property('foo').and.deep.equal('bar')
	})

	it('should use value from config file, if argv value is using default value', function () {
	var argv = parser([], {
		alias: {
		z: 'zoom'
		},
		config: ['settings'],
		default: {
		settings: jsonPath,
		foo: 'banana'
		}
	})

	argv.should.have.property('herp', 'derp')
	argv.should.have.property('zoom', 55)
	argv.should.have.property('foo').and.deep.equal('baz')
	})

	it('should use value from config file, if argv key is a boolean', function () {
	var argv = parser([], {
		config: ['settings'],
		default: {
		settings: jsonPath
		},
		boolean: ['truthy']
	})

	argv.should.have.property('truthy', true)
	})

	it('should use value from cli, if cli overrides boolean argv key', function () {
	var argv = parser(['--no-truthy'], {
		config: ['settings'],
		default: {
		settings: jsonPath
		},
		boolean: ['truthy']
	})

	argv.should.have.property('truthy', false)
	})

	it('should use cli value, if cli value is set and both cli and default value match', function () {
	var argv = parser(['--foo', 'banana'], {
		alias: {
		z: 'zoom'
		},
		config: ['settings'],
		default: {
		settings: jsonPath,
		foo: 'banana'
		}
	})

	argv.should.have.property('herp', 'derp')
	argv.should.have.property('zoom', 55)
	argv.should.have.property('foo').and.deep.equal('banana')
	})

	it("should allow config to be set as flag in 'option'", function () {
	var argv = parser([ '--settings', jsonPath, '--foo', 'bar' ], {
		alias: {
		z: 'zoom'
		},
		config: ['settings']
	})

	argv.should.have.property('herp', 'derp')
	argv.should.have.property('zoom', 55)
	argv.should.have.property('foo').and.deep.equal('bar')
	})

	it('should load options and values from a JS file when config has .js extention', function () {
	var jsPath = path.resolve(__dirname, './fixtures/settings.js')
	var argv = parser([ '--settings', jsPath, '--foo', 'bar' ], {
		config: ['settings']
	})

	argv.should.have.property('herp', 'derp')
	argv.should.have.property('foo', 'bar')
	argv.should.have.property('calculate').and.be.a('function')
	})

	it('should raise an appropriate error if JSON file is not found', function () {
	var argv = parser.detailed(['--settings', 'fake.json', '--foo', 'bar'], {
		alias: {
		z: 'zoom'
		},
		config: ['settings']
	})

	argv.error.message.should.equal('Invalid JSON config file: fake.json')
	})

	// see: https://github.com/bcoe/yargs/issues/172
	it('should not raise an exception if config file is set as default argument value', function () {
	var argv = parser.detailed([], {
		default: {
		config: 'foo.json'
		},
		config: ['config']
	})

	expect(argv.error).to.equal(null)
	})

	it('should load nested options from config file', function () {
	var jsonPath = path.resolve(__dirname, './fixtures/nested_config.json')
	var argv = parser(['--settings', jsonPath, '--nested.foo', 'bar'], {
		config: ['settings']
	})

	argv.should.have.property('a', 'a')
	argv.should.have.property('b', 'b')
	argv.should.have.property('nested').and.deep.equal({
		foo: 'bar',
		bar: 'bar'
	})
	})

	it('should use nested value from config file, if argv value is using default value', function () {
	var jsonPath = path.resolve(__dirname, './fixtures/nested_config.json')
	var argv = parser(['--settings', jsonPath], {
		config: ['settings'],
		default: {
		'nested.foo': 'banana'
		}
	})

	argv.should.have.property('a', 'a')
	argv.should.have.property('b', 'b')
	argv.should.have.property('nested').and.deep.equal({
		foo: 'baz',
		bar: 'bar'
	})
	})

	it('allows a custom parsing function to be provided', function () {
	var jsPath = path.resolve(__dirname, './fixtures/config.txt')
	var argv = parser([ '--settings', jsPath, '--foo', 'bar' ], {
		config: {
		settings: function (configPath) {
			// as an example, parse an environment
			// variable style config:
			// FOO=99
			// BATMAN=grumpy
			var config = {}
			var txt = fs.readFileSync(configPath, 'utf-8')
			txt.split(/\r?\n/).forEach(function (l) {
			var kv = l.split('=')
			config[kv[0].toLowerCase()] = kv[1]
			})
			return config
		}
		}
	})

	argv.batman.should.equal('grumpy')
	argv.awesome.should.equal('banana')
	argv.foo.should.equal('bar')
	})

	it('allows a custom parsing function to be provided as an alias', function () {
	var jsPath = path.resolve(__dirname, './fixtures/config.json')
	var argv = parser([ '--settings', jsPath, '--foo', 'bar' ], {
		config: {
		s: function (configPath) {
			return JSON.parse(fs.readFileSync(configPath, 'utf-8'))
		}
		},
		alias: {
		s: ['settings']
		}
	})

	argv.should.have.property('herp', 'derp')
	argv.should.have.property('foo', 'bar')
	})

	it('outputs an error returned by the parsing function', function () {
	var argv = parser.detailed(['--settings=./package.json'], {
		config: {
		settings: function (configPath) {
			return Error('someone set us up the bomb')
		}
		}
	})

	argv.error.message.should.equal('someone set us up the bomb')
	})

	it('outputs an error if thrown by the parsing function', function () {
	var argv = parser.detailed(['--settings=./package.json'], {
		config: {
		settings: function (configPath) {
			throw Error('someone set us up the bomb')
		}
		}
	})

	argv.error.message.should.equal('someone set us up the bomb')
	})
})

describe('config objects', function () {
	it('should load options from config object', function () {
	var argv = parser([ '--foo', 'bar' ], {
		configObjects: [{
		apple: 'apple',
		banana: 42,
		foo: 'baz'
		}]
	})

	argv.should.have.property('apple', 'apple')
	argv.should.have.property('banana', 42)
	argv.should.have.property('foo', 'bar')
	})

	it('should use value from config object, if argv value is using default value', function () {
	var argv = parser([], {
		configObjects: [{
		apple: 'apple',
		banana: 42,
		foo: 'baz'
		}],
		default: {
		foo: 'banana'
		}
	})

	argv.should.have.property('apple', 'apple')
	argv.should.have.property('banana', 42)
	argv.should.have.property('foo', 'baz')
	})

	it('should use value from config object to all aliases', function () {
	var argv = parser([], {
		configObjects: [{
		apple: 'apple',
		banana: 42,
		foo: 'baz'
		}],
		alias: {
		a: ['apple'],
		banana: ['b']
		}
	})

	argv.should.have.property('apple', 'apple')
	argv.should.have.property('a', 'apple')
	argv.should.have.property('banana', 42)
	argv.should.have.property('b', 42)
	argv.should.have.property('foo', 'baz')
	})

	it('should load nested options from config object', function () {
	var argv = parser(['--nested.foo', 'bar'], {
		configObjects: [{
		a: 'a',
		nested: {
			foo: 'baz',
			bar: 'bar'
		},
		b: 'b'
		}]
	})

	argv.should.have.property('a', 'a')
	argv.should.have.property('b', 'b')
	argv.should.have.property('nested').and.deep.equal({
		foo: 'bar',
		bar: 'bar'
	})
	})

	it('should use nested value from config object, if argv value is using default value', function () {
	var argv = parser([], {
		configObjects: [{
		a: 'a',
		nested: {
			foo: 'baz',
			bar: 'bar'
		},
		b: 'b'
		}],
		default: {
		'nested.foo': 'banana'
		}
	})

	argv.should.have.property('a', 'a')
	argv.should.have.property('b', 'b')
	argv.should.have.property('nested').and.deep.equal({
		foo: 'baz',
		bar: 'bar'
	})
	})
})

describe('dot notation', function () {
	it('should allow object graph traversal via dot notation', function () {
	var argv = parser([
		'--foo.bar', '3', '--foo.baz', '4',
		'--foo.quux.quibble', '5', '--foo.quux.o_O',
		'--beep.boop'
	])
	argv.should.have.property('foo').and.deep.equal({
		bar: 3,
		baz: 4,
		quux: {
		quibble: 5,
		o_O: true
		}
	})
	argv.should.have.property('beep').and.deep.equal({ boop: true })
	})

	it('should apply defaults to dot notation arguments', function () {
	var argv = parser([], {
		default: {
		'foo.bar': 99
		}
	})

	argv.foo.bar.should.eql(99)
	})

	// see #279
	it('should allow default to be overridden when an alias is provided', function () {
	var argv = parser(['--foo.bar', '200'], {
		default: {
		'foo.bar': 99
		}
	})

	argv.foo.bar.should.eql(200)
	})

	// see #279
	it('should also override alias', function () {
	var argv = parser(['--foo.bar', '200'], {
		alias: {
		'foo.bar': ['f']
		},
		default: {
		'foo.bar': 99
		}
	})

	argv.f.should.eql(200)
	})

	// see #279
	it('should not set an undefined dot notation key', function () {
	var argv = parser(['--foo.bar', '200'], {
		default: {
		'foo.bar': 99
		},
		alias: {
		'foo.bar': ['f']
		}
	})

	;('foo.bar' in argv).should.equal(false)
	})

	it('should respect .string() for dot notation arguments', function () {
	var argv = parser(['--foo.bar', '99', '--bar.foo=99'], {
		string: ['foo.bar']
	})

	argv.foo.bar.should.eql('99')
	argv.bar.foo.should.eql(99)
	})

	it('should populate aliases when dot notation is used', function () {
	var argv = parser(['--foo.bar', '99'], {
		alias: {
		foo: ['f']
		}
	})

	argv.f.bar.should.eql(99)
	})

	it('should populate aliases when nested dot notation is used', function () {
	var argv = parser(['--foo.bar.snuh', '99', '--foo.apple', '33', '--foo.bar.cool', '11'], {
		alias: {
		foo: ['f']
		}
	})

	argv.f.bar.snuh.should.eql(99)
	argv.foo.bar.snuh.should.eql(99)

	argv.f.apple.should.eql(33)
	argv.foo.apple.should.eql(33)

	argv.f.bar.cool.should.eql(11)
	argv.foo.bar.cool.should.eql(11)
	})

	it("should allow flags to use dot notation, when seperated by '='", function () {
	var argv = parser(['-f.foo=99'])
	argv.f.foo.should.eql(99)
	})

	it("should allow flags to use dot notation, when seperated by ' '", function () {
	var argv = parser(['-f.foo', '99'])
	argv.f.foo.should.eql(99)
	})

	it('should allow flags to use dot notation when no right-hand-side is given', function () {
	var argv = parser(['-f.foo', '99', '-f.bar'])
	argv.f.foo.should.eql(99)
	argv.f.bar.should.eql(true)
	})
})

it('should set boolean and alias using explicit true', function () {
	var aliased = [ '-h', 'true' ]
	var aliasedArgv = parser(aliased, {
	boolean: ['h'],
	alias: {
		h: ['herp']
	}
	})

	aliasedArgv.should.have.property('herp', true)
	aliasedArgv.should.have.property('h', true)
	aliasedArgv.should.have.property('_').with.length(0)
})

// regression, see https://github.com/substack/node-optimist/issues/71
it('should set boolean and --x=true', function () {
	var parsed = parser(['--boool', '--other=true'], {
	boolean: ['boool']
	})
	parsed.should.have.property('boool', true)
	parsed.should.have.property('other', 'true')
	parsed = parser(['--boool', '--other=false'], {
	boolean: ['boool']
	})
	parsed.should.have.property('boool', true)
	parsed.should.have.property('other', 'false')
})

// regression, see https://github.com/chevex/yargs/issues/66
it('should set boolean options values if next value is "true" or "false" with = as separator', function () {
	var argv = parser(['--bool=false'], {
	boolean: ['b'],
	alias: {
		b: ['bool']
	},
	default: {
		b: true
	}
	})

	argv.bool.should.eql(false)
})

describe('short options', function () {
	it('should set the value of multiple single short options to the next supplied values relative to each', function () {
	var parse = parser(['-h', 'localhost', '-p', '555'])
	parse.should.have.property('h', 'localhost')
	parse.should.have.property('p', 555)
	parse.should.have.property('_').with.length(0)
	})

	it('should set the value of a single short option to the next supplied value', function () {
	var parse = parser(['-h', 'localhost'])
	parse.should.have.property('h', 'localhost')
	parse.should.have.property('_').with.length(0)
	})

	it('should expand grouped short options to a hash with a key for each', function () {
	var parse = parser(['-cats'])
	parse.should.have.property('c', true)
	parse.should.have.property('a', true)
	parse.should.have.property('t', true)
	parse.should.have.property('s', true)
	parse.should.have.property('_').with.length(0)
	})

	it('should set n to the numeric value 123', function () {
	var argv = parser([ '-n123' ])
	argv.should.have.property('n', 123)
	})

	it('should set n to the numeric value 123, with n at the end of a group', function () {
	var argv = parser([ '-ab5n123' ])
	argv.should.have.property('a', true)
	argv.should.have.property('b', true)
	argv.should.have.property('5', true)
	argv.should.have.property('n', 123)
	argv.should.have.property('_').with.length(0)
	})

	it('should set n to the numeric value 123, with = as separator', function () {
	var argv = parser([ '-n=123' ])
	argv.should.have.property('n', 123)
	})

	it('should set n to the numeric value 123, with n at the end of a group and = as separator', function () {
	var argv = parser([ '-ab5n=123' ])
	argv.should.have.property('a', true)
	argv.should.have.property('b', true)
	argv.should.have.property('5', true)
	argv.should.have.property('n', 123)
	argv.should.have.property('_').with.length(0)
	})
})

describe('whitespace', function () {
	it('should be whitespace', function () {
	var argv = parser([ '-x', '\t' ])
	argv.should.have.property('x', '\t')
	})
})

describe('boolean modifier function', function () {
	it('should prevent yargs from sucking in the next option as the value of the first option', function () {
	// Arrange & Act
	var result = parser(['-b', '123'], {
		boolean: ['b']
	})
	// Assert
	result.should.have.property('b').that.is.a('boolean').and.is.true
	result.should.have.property('_').and.deep.equal([123])
	})
})

describe('defaults', function () {
	function checkNoArgs (opts, hasAlias) {
	it('should set defaults if no args', function () {
		var result = parser([], opts)
		result.should.have.property('flag', true)
		if (hasAlias) {
		result.should.have.property('f', true)
		}
	})
	}

	function checkExtraArg (opts, hasAlias) {
	it('should set defaults if one extra arg', function () {
		var result = parser(['extra'], opts)
		result.should.have.property('flag', true)
		result.should.have.property('_').and.deep.equal(['extra'])
		if (hasAlias) {
		result.should.have.property('f', true)
		}
	})
	}

	function checkStringArg (opts, hasAlias) {
	it('should set defaults even if arg looks like a string', function () {
		var result = parser([ '--flag', 'extra' ], opts)
		result.should.have.property('flag', true)
		result.should.have.property('_').and.deep.equal(['extra'])
		if (hasAlias) {
		result.should.have.property('f', true)
		}
	})
	}

	describe('for options with aliases', function () {
	var opts = {
		alias: {
		flag: ['f']
		},
		default: {
		flag: true
		}
	}

	checkNoArgs(opts, true)
	checkExtraArg(opts, true)
	})

	describe('for typed options without aliases', function () {
	var opts = {
		boolean: ['flag'],
		default: {
		flag: true
		}
	}

	checkNoArgs(opts)
	checkExtraArg(opts)
	checkStringArg(opts)
	})

	describe('for typed options with aliases', function () {
	var opts = {
		alias: {
		flag: ['f']
		},
		boolean: ['flag'],
		default: {
		flag: true
		}
	}

	checkNoArgs(opts, true)
	checkExtraArg(opts, true)
	checkStringArg(opts, true)
	})

	describe('for boolean options', function () {
	[true, false, undefined, null].forEach(function (def) {
		describe('with explicit ' + def + ' default', function () {
		var opts = {
			default: {
			flag: def
			},
			boolean: ['flag']
		}

		it('should set true if --flag in arg', function () {
			parser(['--flag'], opts).flag.should.be.true
		})

		it('should set false if --no-flag in arg', function () {
			parser(['--no-flag'], opts).flag.should.be.false
		})

		it('should set ' + def + ' if no flag in arg', function () {
			expect(parser([], opts).flag).to.equal(def)
		})
		})
	})

	describe('with implied false default', function () {
		var opts = null

		beforeEach(function () {
		opts = {
			boolean: ['flag']
		}
		})

		it('should set true if --flag in arg', function () {
		parser(['--flag'], opts).flag.should.be.true
		})

		it('should set false if --no-flag in arg', function () {
		parser(['--no-flag'], opts).flag.should.be.false
		})

		it('should set false if no flag in arg', function () {
		parser([], opts).flag.should.be.false
		})
	})

	// Fixes: https://github.com/bcoe/yargs/issues/341
	it('should apply defaults to camel-case form of argument', function () {
		var argv = parser([], {
		default: {
			'foo-bar': 99
		}
		})

		argv.fooBar.should.equal(99)
	})
	})

	it('should define option as boolean and set default to true', function () {
	var argv = parser([], {
		boolean: ['sometrue'],
		default: {
		sometrue: true
		}
	})
	argv.should.have.property('sometrue', true)
	})

	it('should define option as boolean and set default to false', function () {
	var argv = parser([], {
		default: {
		somefalse: false
		},
		boolean: ['somefalse']
	})
	argv.should.have.property('somefalse', false)
	})

	it('should set boolean options to false by default', function () {
	var parse = parser(['moo'], {
		boolean: ['t', 'verbose'],
		default: {
		verbose: false,
		t: false
		}
	})
	parse.should.have.property('verbose', false).and.be.a('boolean')
	parse.should.have.property('t', false).and.be.a('boolean')
	parse.should.have.property('_').and.deep.equal(['moo'])
	})
})

describe('camelCase', function () {
	function runTests (strict) {
	if (!strict) {
		// Skip this test in strict mode because this option is not specified
		it('should provide options with dashes as camelCase properties', function () {
		var result = parser(['--some-option'])

		result.should.have.property('some-option').that.is.a('boolean').and.is.true
		result.should.have.property('someOption').that.is.a('boolean').and.is.true
		})
	}

	it('should provide count options with dashes as camelCase properties', function () {
		var result = parser([ '--some-option', '--some-option', '--some-option' ], {
		count: ['some-option']
		})

		result.should.have.property('some-option', 3)
		result.should.have.property('someOption', 3)
	})

	it('should provide options with dashes and aliases as camelCase properties', function () {
		var result = parser(['--some-option'], {
		alias: {
			'some-horse': 'o'
		}
		})

		result.should.have.property('some-option').that.is.a('boolean').and.is.true
		result.should.have.property('someOption').that.is.a('boolean').and.is.true
	})

	it('should provide defaults of options with dashes as camelCase properties', function () {
		var result = parser([], {
		default: {
			'some-option': 'asdf'
		}
		})

		result.should.have.property('some-option', 'asdf')
		result.should.have.property('someOption', 'asdf')
	})

	it('should provide aliases of options with dashes as camelCase properties', function () {
		var result = parser([], {
		default: {
			'some-option': 'asdf'
		},
		alias: {
			'some-option': ['o']
		}
		})

		result.should.have.property('o', 'asdf')
		result.should.have.property('some-option', 'asdf')
		result.should.have.property('someOption', 'asdf')
	})

	it('should provide aliases of options with dashes as camelCase properties', function () {
		var result = parser([], {
		alias: {
			o: ['some-option']
		},
		default: {
			o: 'asdf'
		}
		})

		result.should.have.property('o', 'asdf')
		result.should.have.property('some-option', 'asdf')
		result.should.have.property('someOption', 'asdf')
	})

	it('should provide aliases with dashes as camelCase properties', function () {
		var result = parser(['--some-option', 'val'], {
		alias: {
			o: 'some-option'
		}
		})

		result.should.have.property('o').that.is.a('string').and.equals('val')
		result.should.have.property('some-option').that.is.a('string').and.equals('val')
		result.should.have.property('someOption').that.is.a('string').and.equals('val')
	})
	}

	describe('dashes and camelCase', function () {
	runTests()
	})

	describe('dashes and camelCase (strict)', function () {
	runTests(true)
	})
})

describe('-', function () {
	it('should set - as value of n', function () {
	var argv = parser(['-n', '-'])
	argv.should.have.property('n', '-')
	argv.should.have.property('_').with.length(0)
	})

	it('should set - as a non-hyphenated value', function () {
	var argv = parser(['-'])
	argv.should.have.property('_').and.deep.equal(['-'])
	})

	it('should set - as a value of f', function () {
	var argv = parser(['-f-'])
	argv.should.have.property('f', '-')
	argv.should.have.property('_').with.length(0)
	})

	it('should set b to true and set - as a non-hyphenated value when b is set as a boolean', function () {
	var argv = parser(['-b', '-'], {
		boolean: ['b']
	})

	argv.should.have.property('b', true)
	argv.should.have.property('_').and.deep.equal(['-'])
	})

	it('should set - as the value of s when s is set as a string', function () {
	var argv = parser([ '-s', '-' ], {
		string: ['s']
	})

	argv.should.have.property('s', '-')
	argv.should.have.property('_').with.length(0)
	})
})

describe('count', function () {
	it('should count the number of times a boolean is present', function () {
	var parsed

	parsed = parser(['-x'], {
		count: ['verbose']
	})
	parsed.verbose.should.equal(0)

	parsed = parser(['--verbose'], {
		count: ['verbose']
	})
	parsed.verbose.should.equal(1)

	parsed = parser(['--verbose', '--verbose'], {
		count: ['verbose']
	})
	parsed.verbose.should.equal(2)

	parsed = parser(['-vvv'], {
		alias: {
		v: ['verbose']
		},
		count: ['verbose']
	})
	parsed.verbose.should.equal(3)

	parsed = parser(['--verbose', '--verbose', '-v', '--verbose'], {
		count: ['verbose'],
		alias: {
		v: ['verbose']
		}
	})
	parsed.verbose.should.equal(4)

	parsed = parser(['--verbose', '--verbose', '-v', '-vv'], {
		count: ['verbose'],
		alias: {
		v: ['verbose']
		}
	})
	parsed.verbose.should.equal(5)
	})

	it('should not consume the next argument', function () {
	var parsed = parser([ '-v', 'moo' ], {
		count: 'v'
	})
	parsed.v.should.equal(1)
	parsed.should.have.property('_').and.deep.equal(['moo'])

	parsed = parser([ '--verbose', 'moomoo', '--verbose' ], {
		count: 'verbose'
	})
	parsed.verbose.should.equal(2)
	parsed.should.have.property('_').and.deep.equal(['moomoo'])
	})

	it('should use a default value as is when no arg given', function () {
	var parsed = parser([], {
		count: 'v',
		default: { v: 3 }
	})
	parsed.v.should.equal(3)

	parsed = parser([], {
		count: 'v',
		default: { v: undefined }
	})
	expect(parsed.v).to.be.undefined

	parsed = parser([], {
		count: 'v',
		default: { v: null }
	})
	expect(parsed.v).to.be.null

	parsed = parser([], {
		count: 'v',
		default: { v: false }
	})
	parsed.v.should.equal(false)

	parsed = parser([], {
		count: 'v',
		default: { v: 'hello' }
	})
	parsed.v.should.equal('hello')
	})

	it('should ignore a default value when arg given', function () {
	var parsed = parser(['-vv', '-v', '-v'], {
		count: 'v',
		default: { v: 1 }
	})
	parsed.v.should.equal(4)
	})

	it('should increment regardless of arg value', function () {
	var parsed = parser([
		'-v',
		'-v=true',
		'-v', 'true',
		'-v=false',
		'-v', 'false',
		'--no-v',
		'-v=999',
		'-v=foobar'
	], { count: 'v' })
	parsed.v.should.equal(8)
	})
})

describe('array', function () {
	it('should group values into an array if the same option is specified multiple times', function () {
	var parse = parser(['-v', 'a', '-v', 'b', '-v', 'c'])
	parse.should.have.property('v').and.deep.equal(['a', 'b', 'c'])
	parse.should.have.property('_').with.length(0)
	})

	it('should default an array to an empty array if passed as first option followed by another', function () {
	var result = parser(['-a', '-b'], {
		array: 'a'
	})
	result.should.have.property('a').and.deep.equal([])
	})

	it('should not attempt to default array if an element has already been populated', function () {
	var result = parser(['-a', 'foo', 'bar', '-b'], {
		array: 'a'
	})
	result.should.have.property('a').and.deep.equal(['foo', 'bar'])
	})

	it('should default argument to empty array if no value given', function () {
	var result = parser(['-b'], {
		array: 'b'
	})
	result.should.have.property('b').and.deep.equal([])
	})

	it('should place value of argument in array, when one argument provided', function () {
	var result = parser(['-b', '33'], {
		array: ['b']
	})
	Array.isArray(result.b).should.equal(true)
	result.b[0].should.equal(33)
	})

	it('should add multiple argument values to the array', function () {
	var result = parser(['-b', '33', '-b', 'hello'], {
		array: 'b'
	})
	Array.isArray(result.b).should.equal(true)
	result.b.should.include(33)
	result.b.should.include('hello')
	})

	it('should allow array: true, to be set inside an option block', function () {
	var result = parser(['-b', '33'], {
		array: 'b'
	})
	Array.isArray(result.b).should.equal(true)
	result.b.should.include(33)
	})

	// issue #103
	it('should default camel-case alias to array type', function () {
	var result = parser(['--ca-path', 'http://www.example.com'], {
		array: ['ca-path']
	})

	Array.isArray(result['ca-path']).should.equal(true)
	Array.isArray(result.caPath).should.equal(true)
	})

	it('should default alias to array type', function () {
	var result = parser(['--ca-path', 'http://www.example.com'], {
		array: 'ca-path',
		alias: {
		'ca-path': 'c'
		}
	})

	Array.isArray(result['ca-path']).should.equal(true)
	Array.isArray(result.caPath).should.equal(true)
	Array.isArray(result.c).should.equal(true)
	})

	// see: https://github.com/bcoe/yargs/issues/162
	it('should eat non-hyphenated arguments until hyphenated option is hit', function () {
	var result = parser(['-a=hello', 'world', '-b',
		'33', '22', '--foo', 'red', 'green',
		'--bar=cat', 'dog'], {
		array: ['a', 'b', 'foo', 'bar']
		})

	Array.isArray(result.a).should.equal(true)
	result.a.should.include('hello')
	result.a.should.include('world')

	Array.isArray(result.b).should.equal(true)
	result.b.should.include(33)
	result.b.should.include(22)

	Array.isArray(result.foo).should.equal(true)
	result.foo.should.include('red')
	result.foo.should.include('green')

	Array.isArray(result.bar).should.equal(true)
	result.bar.should.include('cat')
	result.bar.should.include('dog')
	})

	// see: https://github.com/yargs/yargs-parser/pull/13
	it('should support array for --foo= format when the key is a number', function () {
	var result = parser(['--1=a', 'b'], {
		array: ['1']
	})

	Array.isArray(result['1']).should.equal(true)
	result['1'][0].should.equal('a')
	result['1'][1].should.equal('b')
	})
})

describe('nargs', function () {
	it('should allow the number of arguments following a key to be specified', function () {
	var result = parser([ '--foo', 'apple', 'bar' ], {
		narg: {
		foo: 2
		}
	})

	Array.isArray(result.foo).should.equal(true)
	result.foo[0].should.equal('apple')
	result.foo[1].should.equal('bar')
	})

	it('should raise an exception if there are not enough arguments following key', function () {
	var argv = parser.detailed('--foo apple', {
		narg: {
		foo: 2
		}
	})
	argv.error.message.should.equal('Not enough arguments following: foo')
	})

	it('nargs is applied to aliases', function () {
	var result = parser(['--bar', 'apple', 'bar'], {
		narg: {
		foo: 2
		},
		alias: {
		foo: 'bar'
		}
	})
	Array.isArray(result.foo).should.equal(true)
	result.foo[0].should.equal('apple')
	result.foo[1].should.equal('bar')
	})

	it('should apply nargs to flag arguments', function () {
	var result = parser([ '-f', 'apple', 'bar', 'blerg' ], {
		narg: {
		f: 2
		}
	})

	result.f[0].should.equal('apple')
	result.f[1].should.equal('bar')
	result._[0].should.equal('blerg')
	})

	it('should support nargs for -f= and --bar= format arguments', function () {
	var result = parser(['-f=apple', 'bar', 'blerg', '--bar=monkey', 'washing', 'cat'], {
		narg: {
		f: 2,
		bar: 2
		}
	})

	result.f[0].should.equal('apple')
	result.f[1].should.equal('bar')
	result._[0].should.equal('blerg')

	result.bar[0].should.equal('monkey')
	result.bar[1].should.equal('washing')
	result._[1].should.equal('cat')
	})

	it('should not modify the input args if an = was used', function () {
	var expected = ['-f=apple', 'bar', 'blerg', '--bar=monkey', 'washing', 'cat']
	var args = expected.slice()
	parser(args, {
		narg: {
		f: 2,
		bar: 2
		}
	})
	args.should.deep.equal(expected)

	parser.detailed(args, {
		narg: {
		f: 2,
		bar: 2
		}
	})
	args.should.deep.equal(expected)
	})

	it('allows multiple nargs to be set at the same time', function () {
	var result = parser([ '--foo', 'apple', 'bar', '--bar', 'banana', '-f' ], {
		narg: {
		foo: 2,
		bar: 1
		}
	})

	Array.isArray(result.foo).should.equal(true)
	result.foo[0].should.equal('apple')
	result.foo[1].should.equal('bar')
	result.bar.should.equal('banana')
	result.f.should.equal(true)
	})

	// see: https://github.com/yargs/yargs-parser/pull/13
	it('should support nargs for --foo= format when the key is a number', function () {
	var result = parser(['--1=a', 'b'], {
		narg: {
		1: 2
		}
	})

	Array.isArray(result['1']).should.equal(true)
	result['1'][0].should.equal('a')
	result['1'][1].should.equal('b')
	})
})

describe('env vars', function () {
	it('should apply all env vars if prefix is empty', function () {
	process.env.ONE_FISH = 'twofish'
	process.env.RED_FISH = 'bluefish'
	var result = parser([], {
		envPrefix: ''
	})

	result.oneFish.should.equal('twofish')
	result.redFish.should.equal('bluefish')
	})

	it('should apply only env vars matching prefix if prefix is valid string', function () {
	process.env.ONE_FISH = 'twofish'
	process.env.RED_FISH = 'bluefish'
	process.env.GREEN_EGGS = 'sam'
	process.env.GREEN_HAM = 'iam'
	var result = parser([], {
		envPrefix: 'GREEN'
	})

	result.eggs.should.equal('sam')
	result.ham.should.equal('iam')
	expect(result.oneFish).to.be.undefined
	expect(result.redFish).to.be.undefined
	})

	it('should set aliases for options defined by env var', function () {
	process.env.AIRFORCE_ONE = 'two'
	var result = parser([], {
		envPrefix: 'AIRFORCE',
		alias: {
		'1': ['one', 'uno']
		}
	})

	result['1'].should.equal('two')
	result.one.should.equal('two')
	result.uno.should.equal('two')
	})

	it('should prefer command line value over env var', function () {
	process.env.FOO_BAR = 'ignore'
	var result = parser(['--foo-bar', 'baz'], {
		envPrefix: ''
	})

	result.fooBar.should.equal('baz')
	})

	it('should respect type for args defined by env var', function () {
	process.env.MY_TEST_STRING = '1'
	process.env.MY_TEST_NUMBER = '2'
	var result = parser([], {
		string: 'string',
		envPrefix: 'MY_TEST_'
	})

	result.string.should.equal('1')
	result.number.should.equal(2)
	})

	it('should set option from aliased env var', function () {
	process.env.SPACE_X = 'awesome'
	var result = parser([], {
		alias: {
		xactly: 'x'
		},
		envPrefix: 'SPACE'
	})

	result.xactly.should.equal('awesome')
	})

	it('should prefer env var value over configured default', function () {
	process.env.FOO_BALL = 'wut'
	process.env.FOO_BOOL = 'true'
	var result = parser([], {
		envPrefix: 'FOO',
		default: {
		ball: 'baz',
		bool: false
		},
		boolean: 'bool',
		string: 'ball'
	})

	result.ball.should.equal('wut')
	result.bool.should.equal(true)
	})

	var jsonPath = path.resolve(__dirname, './fixtures/config.json')
	it('should prefer config file value over env var', function () {
	process.env.CFG_HERP = 'zerp'
	var result = parser(['--cfg', jsonPath], {
		envPrefix: 'CFG',
		config: 'cfg',
		string: 'herp',
		default: {
		herp: 'nerp'
		}
	})

	result.herp.should.equal('derp')
	})

	it('should support an env var value as config file option', function () {
	process.env.TUX_CFG = jsonPath
	var result = parser([], {
		envPrefix: 'TUX',
		config: ['cfg'],
		default: {
		z: 44
		}
	})

	result.should.have.property('herp')
	result.should.have.property('foo')
	result.should.have.property('version')
	result.should.have.property('truthy')
	result.z.should.equal(55)
	})

	it('should prefer cli config file option over env var config file option', function () {
	process.env.MUX_CFG = path.resolve(__dirname, '../package.json')
	var result = parser(['--cfg', jsonPath], {
		envPrefix: 'MUX',
		config: 'cfg'
	})

	result.should.have.property('herp')
	result.should.have.property('foo')
	result.should.have.property('version')
	result.should.have.property('truthy')
	result.z.should.equal(55)
	})

	it('should apply all nested env vars', function () {
	process.env.TEST_A = 'a'
	process.env.TEST_NESTED_OPTION__FOO = 'baz'
	process.env.TEST_NESTED_OPTION__BAR = 'bar'
	var result = parser(['--nestedOption.foo', 'bar'], {
		envPrefix: 'TEST'
	})

	result.should.have.property('a', 'a')
	result.should.have.property('nestedOption').and.deep.equal({
		foo: 'bar',
		bar: 'bar'
	})
	})

	it('should apply nested env var if argv value is using default value', function () {
	process.env.TEST_A = 'a'
	process.env.TEST_NESTED_OPTION__FOO = 'baz'
	process.env.TEST_NESTED_OPTION__BAR = 'bar'
	var result = parser([], {
		envPrefix: 'TEST',
		default: {
		'nestedOption.foo': 'banana'
		}
	})

	result.should.have.property('a', 'a')
	result.should.have.property('nestedOption').and.deep.equal({
		foo: 'baz',
		bar: 'bar'
	})
	})
})

describe('configuration', function () {
	describe('short option groups', function () {
	it('allows short-option-groups to be disabled', function () {
		var parse = parser(['-cats=meow'], {
		configuration: {
			'short-option-groups': false
		}
		})
		parse.cats.should.equal('meow')
		parse = parser(['-cats', 'meow'], {
		configuration: {
			'short-option-groups': false
		}
		})
		parse.cats.should.equal('meow')
	})
	})

	describe('camel-case expansion', function () {
	it('does not expand camel-case aliases', function () {
		var parsed = parser.detailed([], {
		alias: {
			'foo-bar': ['x']
		},
		configuration: {
			'camel-case-expansion': false
		}
		})

		expect(parsed.newAliases.fooBar).to.equal(undefined)
		expect(parsed.aliases.fooBar).to.equal(undefined)
	})

	it('does not expand camel-case keys', function () {
		var parsed = parser.detailed(['--foo-bar=apple'], {
		configuration: {
			'camel-case-expansion': false
		}
		})

		expect(parsed.argv.fooBar).to.equal(undefined)
		expect(parsed.argv['foo-bar']).to.equal('apple')
	})
	})

	describe('dot notation', function () {
	it('does not expand dot notation defaults', function () {
		var parsed = parser([], {
		default: {
			'foo.bar': 'x'
		},
		configuration: {
			'dot-notation': false
		}
		})

		expect(parsed['foo.bar']).to.equal('x')
	})

	it('does not expand dot notation arguments', function () {
		var parsed = parser(['--foo.bar', 'banana'], {
		configuration: {
			'dot-notation': false
		}
		})
		expect(parsed['foo.bar']).to.equal('banana')
		parsed = parser(['--foo.bar=banana'], {
		configuration: {
			'dot-notation': false
		}
		})
		expect(parsed['foo.bar']).to.equal('banana')
	})

	it('should use value from cli, if cli overrides dot notation default', function () {
		var parsed = parser(['--foo.bar', 'abc'], {
		default: {
			'foo.bar': 'default'
		},
		configuration: {
			'dot-notation': false
		}
		})

		expect(parsed['foo.bar']).to.equal('abc')
	})

	it('should also override dot notation alias', function () {
		var parsed = parser(['--foo.bar', 'abc'], {
		alias: {
			'foo.bar': ['alias.bar']
		},
		default: {
			'foo.bar': 'default'
		},
		configuration: {
			'dot-notation': false
		}
		})

		expect(parsed['alias.bar']).to.equal('abc')
	})

	it('does not expand alias of first element of dot notation arguments', function () {
		var parsed = parser(['--foo.bar', 'banana'], {
		alias: {
			'foo': ['f']
		},
		configuration: {
			'dot-notation': false
		}
		})
		expect(parsed['foo.bar']).to.equal('banana')
		expect(parsed).not.to.include.keys('f.bar')
	})
	})

	describe('parse numbers', function () {
	it('does not coerce defaults into numbers', function () {
		var parsed = parser([], {
		default: {
			'foo': '5'
		},
		configuration: {
			'parse-numbers': false
		}
		})

		expect(parsed['foo']).to.equal('5')
	})

	it('does not coerce arguments into numbers', function () {
		var parsed = parser(['--foo', '5'], {
		configuration: {
			'parse-numbers': false
		}
		})
		expect(parsed['foo']).to.equal('5')
	})

	it('does not coerce positional arguments into numbers', function () {
		var parsed = parser(['5'], {
		configuration: {
			'parse-numbers': false
		}
		})
		expect(parsed._[0]).to.equal('5')
	})
	})

	describe('boolean negation', function () {
	it('does not negate arguments prefixed with --no-', function () {
		var parsed = parser(['--no-dice'], {
		configuration: {
			'boolean-negation': false
		}
		})

		parsed['no-dice'].should.equal(true)
		expect(parsed.dice).to.equal(undefined)
	})
	})
})

// addresses: https://github.com/yargs/yargs-parser/issues/41
it('defaults to empty array if array option is provided no values', function () {
	var parsed = parser(['-f'], {
	'alias': {
		'f': 'files'
	},
	'array': ['files']
	})
	parsed.f.should.deep.equal([])
	parsed.files.should.deep.equal([])

	parsed = parser(['--files'], {
	'alias': {
		'f': 'files'
	},
	'array': ['files']
	})
	parsed.f.should.deep.equal([])
	parsed.files.should.deep.equal([])

	parsed = parser(['-f', '-y'], {
	'alias': {
		'f': 'files'
	},
	'array': ['files']
	})
	parsed.f.should.deep.equal([])
	parsed.files.should.deep.equal([])
})

describe('coerce', function () {
	it('applies coercion function to simple arguments', function () {
	var parsed = parser(['--foo', '99'], {
		coerce: {
		foo: function (arg) {
			return arg * -1
		}
		}
	})
	parsed.foo.should.equal(-99)
	})

	it('applies coercion function to aliases', function () {
	var parsed = parser(['--foo', '99'], {
		coerce: {
		f: function (arg) {
			return arg * -1
		}
		},
		alias: {
		f: ['foo']
		}
	})
	parsed.foo.should.equal(-99)
	parsed.f.should.equal(-99)
	})

	it('applies coercion function to all dot options', function () {
	var parsed = parser(['--foo.bar', 'nananana'], {
		coerce: {
		foo: function (val) {
			val.bar += ', batman!'
			return val
		}
		}
	})
	parsed.foo.bar.should.equal('nananana, batman!')
	})

	it('applies coercion function to an implicit array', function () {
	var parsed = parser(['--foo', '99', '-f', '33'], {
		coerce: {
		f: function (arg) {
			return arg.map(function (a) {
			return a * -1
			})
		}
		},
		alias: {
		f: ['foo']
		}
	})
	parsed.f.should.deep.equal([-99, -33])
	parsed.foo.should.deep.equal([-99, -33])
	})

	it('applies coercion function to an explicit array', function () {
	var parsed = parser(['--foo', '99', '-f', '33'], {
		coerce: {
		f: function (arg) {
			return arg.map(function (a) {
			return a * -1
			})
		}
		},
		array: ['foo'],
		alias: {
		f: ['foo']
		}
	})
	parsed.f.should.deep.equal([-99, -33])
	parsed.foo.should.deep.equal([-99, -33])
	})

	it('applies coercion function to _', function () {
	var parsed = parser(['99', '33'], {
		coerce: {
		_: function (arg) {
			return arg.map(function (a) {
			return a * -1
			})
		}
		}
	})
	parsed._.should.deep.equal([-99, -33])
	})

	// see: https://github.com/yargs/yargs/issues/550
	it('coercion function can be used to parse large #s', function () {
	var fancyNumberParser = function (arg) {
		if (arg.length > 10) return arg
		else return parseInt(arg)
	}
	var parsed = parser(['--foo', '88888889999990000998989898989898', '--bar', '998'], {
		coerce: {
		foo: fancyNumberParser,
		bar: fancyNumberParser
		}
	})
	;(typeof parsed.foo).should.equal('string')
	parsed.foo.should.equal('88888889999990000998989898989898')
	;(typeof parsed.bar).should.equal('number')
	parsed.bar.should.equal(998)
	})

	it('populates argv.error, if an error is thrown', function () {
	var parsed = parser.detailed(['--foo', '99'], {
		coerce: {
		foo: function (arg) {
			throw Error('banana')
		}
		}
	})
	parsed.error.message.should.equal('banana')
	})

	it('populates argv.error, if an error is thrown for an explicit array', function () {
	var parsed = parser.detailed(['--foo', '99'], {
		array: ['foo'],
		coerce: {
		foo: function (arg) {
			throw Error('foo is array: ' + Array.isArray(arg))
		}
		}
	})
	parsed.error.message.should.equal('foo is array: true')
	})
})

// see: https://github.com/yargs/yargs-parser/issues/37
it('normalizes all paths in array when provided via config object', function () {
	var argv = parser([ '--foo', 'bar' ], {
	array: ['a'],
	normalize: ['a'],
	configObjects: [{'a': ['bin/../a.txt', 'bin/../b.txt']}]
	})
	argv.a.should.deep.equal(['a.txt', 'b.txt'])
})
*/
