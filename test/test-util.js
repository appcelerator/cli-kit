import * as util from '../dist/util';

describe('util', () => {
	describe('camelCase()', () => {
		it('should return an empty string when no input', () => {
			expect(util.camelCase()).to.equal('');
		});

		it('should camel case an lowercase string', () => {
			expect(util.camelCase('hello')).to.equal('hello');
		});

		it('should camel case an uppercase string', () => {
			expect(util.camelCase('HELLO')).to.equal('hello');
		});

		it('should camel case a multi-word string with special characters', () => {
			expect(util.camelCase('Hello world!')).to.equal('helloWorld');
		});
	});
});
