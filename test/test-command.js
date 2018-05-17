import CLI, { Command } from '../dist/index';

describe('Commands', () => {
	describe('Constructor', () => {
		it('should error if command name is invalid', () => {
			expect(() => {
				new Command();
			}).to.throw(TypeError, 'Expected name to be a non-empty string');

			expect(() => {
				new Command(123);
			}).to.throw(TypeError, 'Expected name to be a non-empty string');

			expect(() => {
				new Command({});
			}).to.throw(TypeError, 'Expected name to be a non-empty string');

			expect(() => {
				new CLI({
					commands: {
						'': {}
					}
				});
			}).to.throw(TypeError, 'Expected name to be a non-empty string');
		});

		it('should error if command options are invalid', () => {
			expect(() => {
				new Command('foo', 123);
			}).to.throw(TypeError, 'Expected command parameters to be an object');

			expect(() => {
				new Command('foo', 'bar');
			}).to.throw(TypeError, 'Expected command parameters to be an object');

			expect(() => {
				new CLI({
					commands: {
						'': 123
					}
				});
			}).to.throw(TypeError, 'Expected command parameters to be an object');
		});

		it('should error if action is not a function', () => {
			expect(() => {
				new CLI({
					commands: {
						'foo': {
							action: 123
						}
					}
				});
			}).to.throw(TypeError, 'Expected command action to be a function');
		});
	});
});
