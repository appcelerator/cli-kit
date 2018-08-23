import path from 'path';

import { findPackage, wrap } from '../dist/lib/util';

describe('util', () => {
	describe('findPackage()', () => {
		it('should throw error if package.json has syntax error', () => {
			const dir = path.resolve(__dirname, 'fixtures', 'bad-pkg-json');
			expectThrow(() => {
				findPackage(dir);
			}, {
				type:  Error,
				msg:   'Failed to parse package.json: Unexpected token { in JSON at position 1',
				code:  'ERR_INVALID_PACKAGE_JSON',
				file:  path.join(dir, 'package.json'),
				name:  'package.json.bad',
				scope: 'util.findPackage',
				value: '{{{{{{{{{{\n'
			});
		});

		it('should throw error if package.json is not an object', () => {
			const dir = path.resolve(__dirname, 'fixtures', 'invalid-pkg-json');
			expectThrow(() => {
				findPackage(dir);
			}, {
				type:  Error,
				msg:   'Invalid package.json: expected object',
				code:  'ERR_INVALID_PACKAGE_JSON',
				file:  path.join(dir, 'package.json'),
				name:  'package.json.invalid',
				scope: 'util.findPackage',
				value: 'foo'
			});
		});

		it('should find a package', () => {
			const dir = path.resolve(__dirname, 'fixtures', 'simple-module');
			const result = findPackage(dir);

			expect(result.json).to.deep.equal({
				name: 'foo',
				main: './main'
			});

			expect(result.root).to.equal(dir);
			expect(result.main).to.equal(path.join(dir, 'main.js'));
		});

		it('should find a package with no main', () => {
			const dir = path.resolve(__dirname, 'fixtures', 'no-main');
			const result = findPackage(dir);

			expect(result.json).to.deep.equal({
				name: 'foo'
			});

			expect(result.root).to.equal(dir);
			expect(result.main).to.be.null;
		});

		it('should find a package with main in a subdirectory', () => {
			const dir = path.resolve(__dirname, 'fixtures', 'main-subdir');
			const result = findPackage(dir);

			expect(result.json).to.deep.equal({
				name: 'foo',
				main: './src'
			});

			expect(result.root).to.equal(dir);
			expect(result.main).to.equal(path.join(dir, 'src', 'index.js'));
		});
	});

	describe('wrap()', () => {
		it('should not wrap a short string', () => {
			const s = 'Lorem ipsum dolor sit amet';
			expect(wrap(s, 100)).to.equal(s);
			expect(wrap(s, 0)).to.equal(s);
		});

		it('should wrap a long string', () => {
			const s = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.';
			expect(wrap(s, 100)).to.equal('Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore\net dolore magna aliqua.');
			expect(wrap(s, 0)).to.equal(s);
		});

		it('should wrap a long string containing an escape character', () => {
			const s = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do \u001b[Jeiusmod tempor incididunt ut labore et dolore magna aliqua.';
			expect(wrap(s, 100)).to.equal('Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore\net dolore magna aliqua.');
			expect(wrap(s, 0)).to.equal(s);
		});
	});
});
