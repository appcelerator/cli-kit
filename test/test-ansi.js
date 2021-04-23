import snooplogg from 'snooplogg';
import { ansi } from '../dist/index';
import { expect } from 'chai';

const { chalk } = snooplogg;

describe('ansi', () => {
	it('should return the correct ansi escape sequences', () => {
		try {
			expect(ansi.cursor.down()).to.equal('\x1b[1B');
			expect(ansi.cursor.down(1)).to.equal('\x1b[1B');
			expect(ansi.cursor.down(2)).to.equal('\x1b[2B');
			expect(ansi.cursor.down(0)).to.equal('');

			expect(ansi.cursor.up()).to.equal('\x1b[1A');
			expect(ansi.cursor.up(1)).to.equal('\x1b[1A');
			expect(ansi.cursor.up(2)).to.equal('\x1b[2A');
			expect(ansi.cursor.up(0)).to.equal('');

			expect(ansi.cursor.backward()).to.equal('\x1b[1D');
			expect(ansi.cursor.backward(1)).to.equal('\x1b[1D');
			expect(ansi.cursor.backward(2)).to.equal('\x1b[2D');
			expect(ansi.cursor.backward(0)).to.equal('');

			expect(ansi.cursor.forward()).to.equal('\x1b[1C');
			expect(ansi.cursor.forward(1)).to.equal('\x1b[1C');
			expect(ansi.cursor.forward(2)).to.equal('\x1b[2C');
			expect(ansi.cursor.forward(0)).to.equal('');

			expect(ansi.cursor.move()).to.equal('');
			expect(ansi.cursor.move(0)).to.equal('');
			expect(ansi.cursor.move(0, 0)).to.equal('');
			expect(ansi.cursor.move(1)).to.equal('\x1b[1C');
			expect(ansi.cursor.move(-1)).to.equal('\x1b[1D');
			expect(ansi.cursor.move(1, 0)).to.equal('\x1b[1C');
			expect(ansi.cursor.move(1, 2)).to.equal('\x1b[1C\x1b[2B');
			expect(ansi.cursor.move(0, 2)).to.equal('\x1b[2B');
			expect(ansi.cursor.move(1, -2)).to.equal('\x1b[1C\x1b[2A');
			expect(ansi.cursor.move(0, -2)).to.equal('\x1b[2A');

			expect(ansi.cursor.to(0)).to.equal('\x1b[1G');
			expect(ansi.cursor.to(2)).to.equal('\x1b[3G');
			expect(ansi.cursor.to(0, 0)).to.equal('\x1b[1G');
			expect(ansi.cursor.to(0, 1)).to.equal('\x1b[2;1H');
			expect(ansi.cursor.to(2, 4)).to.equal('\x1b[5;3H');

			expect(ansi.cursor.next()).to.equal('\x1b[E');
			expect(ansi.cursor.next(0)).to.equal('');
			expect(ansi.cursor.next(2)).to.equal('\x1b[E\x1b[E');
			expect(ansi.cursor.next(-2)).to.equal('\x1b[F\x1b[F');

			expect(ansi.cursor.prev()).to.equal('\x1b[F');
			expect(ansi.cursor.prev(0)).to.equal('');
			expect(ansi.cursor.prev(2)).to.equal('\x1b[F\x1b[F');
			expect(ansi.cursor.prev(-2)).to.equal('\x1b[E\x1b[E');

			expect(ansi.custom.echo(true)).to.equal('\x1b]666;Echo=on\x07');
			expect(ansi.custom.echo('foo')).to.equal('\x1b]666;Echo=on\x07');
			expect(ansi.custom.echo()).to.equal('\x1b]666;Echo=off\x07');
			expect(ansi.custom.echo(false)).to.equal('\x1b]666;Echo=off\x07');
			expect(ansi.custom.echo('')).to.equal('\x1b]666;Echo=off\x07');

			expect(ansi.erase.lines()).to.equal('');
			expect(ansi.erase.lines(2)).to.equal('\x1b[2K\x1b[1A\x1b[2K\x1b[G');
			expect(ansi.erase.lines(-1)).to.equal('');

			expect(ansi.link('http://test')).to.equal('\x1b]8;;http://test\x07http://test\x1b]8;;\x07');
			expect(ansi.link('foo', 'http://test')).to.equal('\x1b]8;;http://test\x07foo\x1b]8;;\x07');

			expect(ansi.strip()).to.equal('');
			expect(ansi.strip('a\x1b[31mb\x1b[0mc')).to.equal('abc');
		} catch (e) {
			// we need to escape the backslash so that mocha doesn't actually print the ansi escape
			// sequence and mess up the output
			const e2 = new Error(e.message.replace(/\\/g, '\\\\'));
			e2.stack = e.stack;
			throw e2;
		}
	});

	it('should split an empty string', () => {
		expect(ansi.split('')).to.deep.equal([]);
	});

	it('should split a string with any ansi escape codes', () => {
		expect(ansi.split('foo bar')).to.deep.equal([ 'foo bar' ]);
	});

	it('should split a string with only ansi escape codes', () => {
		expect(ansi.split('\x1b[S')).to.deep.equal([ '', '\x1b[S' ]);
	});

	it('should not split a non-string', () => {
		for (const x of [ 123, null, {} ]) {
			expect(ansi.split(x)).to.deep.equal(x);
		}
	});

	it('should split the kitchen sink', () => {
		const tokens = [
			'a',
			'\x07',
			'b',
			'\x1bc',
			'c',
			'\x1b7',
			'd',
			'\x1b[?25h',
			'e',
			'\x1b[?25l',
			'g',
			'\x1b[E',
			'h',
			'\x1b[F',
			'i',
			'\x1b[G',
			'j',
			'\x1b[H',
			'k',
			'\x1b[J',
			'l',
			'\x1b[K',
			'm',
			'\x1b[S',
			'n',
			'\x1b[T',
			'o',
			'\x1b[6n',
			'p',
			'\x1b[2K',
			'q',
			'\x1b[2J',
			'r',
			'\x1b[1K',
			's',
			'\x1b[1J',
			't',
			'\x1b[1A',
			'u',
			'\x1b[12B',
			'v',
			'\x1b[123C',
			'w',
			'\x1b[1234D',
			'x',
			'\x1b[12345G',
			'y',
			'\x1b[12;34H',
			'z',
			'\x1b]666;Echo=on\x07',
			'a',
			'\x1b]666;Echo=off\x07',
			'b',
			'\x1b]666;Exec=${encode(command)}\x07',
			'c',
			'\x1b]666;Exit=${code}\x07',
			'd',
			'\x1b]666;Keypress=${encode(key)}\x07',
			'e',
			'\x1b]8;;https://foo.com?a=b\x07',
			'click here',
			'\x1b]8;;\x07',
			'f',
			'\u001b[31m',
			'g',
			'\u001b[39m',
			'h'
		];
		expect(ansi.split(tokens.join(''))).to.deep.equal(tokens);
	});

	it('should upper case a string', () => {
		expect(ansi.toUpperCase(`All systems ${chalk.green('go')}!`)).to.equal(`ALL SYSTEMS ${chalk.green('GO')}!`);
	});

	it('should lower case a string', () => {
		expect(ansi.toLowerCase(`${chalk.red('Error!')} Something broke!`)).to.equal(`${chalk.red('error!')} something broke!`);
	});

	it('should trim the start of a string', () => {
		expect(ansi.trimStart('  foo  ')).to.equal('foo  ');
		expect(ansi.trimStart(chalk.green('  foo  '))).to.equal(chalk.green('foo  '));
		expect(ansi.trimStart('  ' + chalk.green('  foo  ') + '  ')).to.equal(chalk.green('foo  ') + '  ');
	});

	it('should trim the end of a string', () => {
		expect(ansi.trimEnd('  foo  ')).to.equal('  foo');
		expect(ansi.trimEnd(chalk.green('  foo  '))).to.equal(chalk.green('  foo'));
		expect(ansi.trimEnd('  ' + chalk.green('  foo  ') + '  ')).to.equal('  ' + chalk.green('  foo'));
	});

	it('should trim the start and end of a string', () => {
		expect(ansi.trim('  foo  ')).to.equal('foo');
		expect(ansi.trim(chalk.green('  foo  '))).to.equal(chalk.green('foo'));
		expect(ansi.trim('  ' + chalk.green('  foo  ') + '  ')).to.equal(chalk.green('foo'));
	});
});
