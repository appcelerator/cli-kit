import { render, renderFile } from '../dist/template';

describe('Template', () => {
	describe('render()', () => {
		describe('Plain strings', () => {
			it('should render a plain string', () => {
				const s = render('>hi');
				expect(s).to.equal('hi\n');
			});

			it('should render a plain multiline string', () => {
				const s = render('>hi \\\n\\\nthis is a test');
				expect(s).to.equal('hi\n\nthis is a test\n');
			});
		});

		describe('Variable substitution', () => {
			it('should render variable in output', () => {
				const s = render('>hey ${name}', { name: 'dude' });
				expect(s).to.equal('hey dude\n');
			});

			it('should handle undefined variable in output', () => {
				const s = render('>hey ${name}');
				expect(s).to.equal('hey \n');
			});

			it('should handle null variable in output', () => {
				const s = render('>hey ${name}', { name: null });
				expect(s).to.equal('hey null\n');
			});

			it('should handle error objects in output', () => {
				const err = new Error('Oh no!');
				const s = render('>${err}', { err });
				expect(s).to.equal('Error: Oh no!\n');
			});

			it('should eval functions', () => {
				const s = render('>${text.toLowerCase()}', { text: 'HELLO' });
				expect(s).to.equal('hello\n');
			});
		});
	});

	describe('renderFile()', () => {
		//
	});
});
