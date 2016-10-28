import { sum, Example } from '../src/index';

describe('example', () => {
	it('should add two numbers', () => {
		const total = sum(3, 7);
		expect(total).to.equal(10);
	});

	it('should uppercase a string', () => {
		const example = new Example();
		const result = example.toUpper('appc');
		expect(result).to.equal('APPC');
	});
});
