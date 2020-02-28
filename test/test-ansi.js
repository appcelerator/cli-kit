import { ansi } from '../dist/index';

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
});
