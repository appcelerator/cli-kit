import fs from 'fs';
import path from 'path';

import { template } from '../dist/index';

const { render, renderFile } = template;

describe('Template', () => {
	describe('render()', () => {
		describe('Plain strings', () => {
			it('should render a plain string', () => {
				const s = render('>hi');
				expect(s).to.equal('hi');
			});

			it('should render a plain multiline string', () => {
				const s = render('>hi \\\n\\\nthis is a test');
				expect(s).to.equal('hi\n\nthis is a test');
			});
		});

		describe('Variable substitution', () => {
			it('should render variable in output', () => {
				const s = render('>hello ${name}', { name: 'tester' });
				expect(s).to.equal('hello tester');
			});

			it('should throw error if referencing undefined variable', () => {
				expect(() => {
					render('>hello ${name}');
				}).to.throw(ReferenceError, 'name is not defined');
			});

			it('should handle null variable in output', () => {
				const s = render('>hello ${name}', { name: null });
				expect(s).to.equal('hello null');
			});

			it('should handle error objects in output', () => {
				const err = new Error('Oh no!');
				const s = render('>${err}', { err });
				expect(s).to.equal('Error: Oh no!');
			});

			it('should eval functions', () => {
				const s = render('>${text.toLowerCase()}', { text: 'HELLO' });
				expect(s).to.equal('hello');
			});

			it('should print multiple variables', () => {
				const s = render('>${first} ${last}', { first: 'Bob', last: 'Smith' });
				expect(s).to.equal('Bob Smith');
			});

			it('should print computed values', () => {
				const s = render('>${17 + 83}');
				expect(s).to.equal('100');
			});
		});

		describe('New lines', () => {
			it('should add new lines at the end', () => {
				const s = render('>>>foo');
				expect(s).to.equal('foo\n\n');
			});
		});

		describe('Whitespace', () => {
			it('should trim whitespace', () => {
				expect(render('>foo1')).to.equal('foo1');
				expect(render('> foo2')).to.equal('foo2');
				expect(render('> foo3 ')).to.equal('foo3');
			});

			it('should respect the whitespace', () => {
				expect(render('>| foo1')).to.equal(' foo1');
				expect(render('>|  foo2')).to.equal('  foo2');
				expect(render('>|  foo3 ')).to.equal('  foo3 ');
			});
		});

		describe('Exists modifier', () => {
			it('should not render if value is falsey', () => {
				const s = render('>?${text}', { text: '' });
				expect(s).to.equal('');
			});
		});

		describe('Conditionals', () => {
			it('should handle an if-else-block', () => {
				const template = `>The test is
				if (ok) {
					>| good
				} else {
					>| bad
				}`;
				expect(render(template, { ok: true })).to.equal('The test is good');
				expect(render(template, { ok: false })).to.equal('The test is bad');
			});

			it('should handle a nested if-else-block', () => {
				const template = `>The color is
				if (ok) {
					if (inner) {
						>| red
					} else {
						>| green
					}
				} else {
					if (inner) {
						>| blue
					} else {
						>| yellow
					}
				}`;
				expect(render(template, { ok: true,  inner: true })).to.equal('The color is red');
				expect(render(template, { ok: false, inner: true })).to.equal('The color is blue');
				expect(render(template, { ok: true,  inner: false })).to.equal('The color is green');
				expect(render(template, { ok: false, inner: false })).to.equal('The color is yellow');
			});
		});

		describe('Iteration', () => {
			it('should loop over an array', () => {
				const template = `for (const c of colors.sort()) {
					>> \${c}
				}`;
				const colors = [ 'red', 'green', 'yellow', 'blue', 'white' ];
				expect(render(template, { colors })).to.equal('blue\ngreen\nred\nwhite\nyellow\n');
			});
		});
	});

	describe('renderFile()', () => {
		it('should error if file is not found', () => {
			const file = path.join(__dirname, 'does_not_exist');
			expect(() => {
				renderFile(file);
			}).to.throw(Error, `Unable to find template: ${file}`);
		});

		it('should render a template file', () => {
			const str = renderFile(path.join(__dirname, 'templates', 'example.tpl'));
			expect(str).to.equal(fs.readFileSync(path.join(__dirname, 'templates', 'example.txt'), 'utf8'));
		});
	});
});
