import { Type } from '../dist/parser/types';

describe('Types', () => {
	it('should error params are invalid', () => {
		expectThrow(() => {
			new Type();
		}, {
			type:  TypeError,
			code:  'ERR_TYPE_ERROR',
			msg:   'Expected params to be an object',
			name:  'params',
			scope: 'Type.constructor',
			value: undefined
		});
	});

	it('should error type name is invalid', () => {
		expectThrow(() => {
			new Type({});
		}, {
			type:  TypeError,
			code: 'ERR_TYPE_ERROR',
			msg:   'Missing type name',
			name:  'params.name',
			scope: 'Type.constructor',
			value: undefined
		});

		const name = {};

		expectThrow(() => {
			new Type({ name });
		}, {
			type:  TypeError,
			code:  'ERR_TYPE_ERROR',
			msg:   'Missing type name',
			name:  'params.name',
			scope: 'Type.constructor',
			value: name
		});
	});

	it('should error type transform is invalid', () => {
		expectThrow(() => {
			new Type({ name: 'foo', transform: 123 });
		}, {
			type:  TypeError,
			code:  'ERR_TYPE_ERROR',
			msg:   'Expected transform to be a function',
			name:  'params.transform',
			scope: 'Type.constructor',
			value: 123
		});

		const transform = {};

		expectThrow(() => {
			new Type({ name: 'foo', transform });
		}, {
			type:  TypeError,
			code:  'ERR_TYPE_ERROR',
			msg:   'Expected transform to be a function',
			name:  'params.transform',
			scope: 'Type.constructor',
			value: transform
		});
	});
});
