import js from '@eslint/js';
import globals from 'globals';
import chaiExpect from 'eslint-plugin-chai-expect';
import mocha from 'eslint-plugin-mocha';
import promise from 'eslint-plugin-promise';
import security from 'eslint-plugin-security';

export default [
	js.configs.recommended,
	{
		languageOptions: {
			ecmaVersion: 2022,
			sourceType: 'module',
			globals: {
				...globals.node
			}
		},
		plugins: {
			'chai-expect': chaiExpect,
			mocha,
			promise,
			security
		},
		rules: {
			'array-bracket-spacing': [ 'warn', 'always' ],
			'brace-style': [ 'error', '1tbs', { allowSingleLine: true } ],
			camelcase: 'off',
			'chai-expect/missing-assertion': 'error',
			'chai-expect/terminating-properties': 'warn',
			curly: [ 'error', 'all' ],
			'eol-last': 'error',
			indent: [ 'error', 'tab', { SwitchCase: 1 } ],
			'keyword-spacing': [ 'error' ],
			'linebreak-style': [ 'error', 'unix' ],
			'max-len': [ 'error', 200 ],
			'no-case-declarations': 'off',
			'no-cond-assign': 'off',
			'no-console': 'off',
			'no-control-regex': 'off',
			'no-empty': 'warn',
			'no-inner-declarations': 'off',
			'no-mixed-spaces-and-tabs': 'error',
			'no-multi-str': 'error',
			'no-multiple-empty-lines': 'error',
			'no-trailing-spaces': 'error',
			'no-unused-vars': 'off',
			'no-useless-escape': 'warn',
			'promise/always-return': 'error',
			'promise/no-return-wrap': 'error',
			'promise/param-names': 'error',
			'promise/catch-or-return': 'error',
			'promise/no-native': 'off',
			'promise/no-nesting': 'warn',
			'promise/no-promise-in-callback': 'warn',
			'promise/no-callback-in-promise': 'warn',
			'promise/avoid-new': 'off',
			'promise/no-new-statics': 'error',
			'promise/no-return-in-finally': 'warn',
			'promise/valid-params': 'warn',
			quotes: [ 'error', 'single' ],
			semi: [ 'error', 'always' ],
			'space-before-blocks': [ 'error', 'always' ],
			'space-before-function-paren': [ 'error', { anonymous: 'always', named: 'ignore', asyncArrow: 'always' } ],
			'space-in-parens': [ 'error', 'never' ],
			'space-infix-ops': 'error',
			'space-unary-ops': [ 'error', { nonwords: false, overrides: {} } ]
		}
	},
	{
		files: [ 'test/**/*.js', 'test/**/*.cjs' ],
		languageOptions: {
			globals: {
				console: 'readonly',
				describe: 'readonly',
				expect: 'readonly',
				expectThrow: 'readonly',
				it: 'readonly',
				sinon: 'readonly'
			}
		}
	}
];
