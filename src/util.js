import fs from 'fs';
import E from './errors';
import path from 'path';
import pkgDir from 'pkg-dir';

export { pkgDir };

/**
 * Adds the name of the class and any base classes to an internal `clikit` property.
 *
 * @param {Object} obj - The cli-kit object instance to embed the class name.
 * @param {String} name - The class name.
 * @returns {Object}
 */
export function declareCLIKitClass(obj, name) {
	return Object.defineProperty(obj, 'clikit', {
		configurable: true,
		value: new Set([ name, ...(obj.clikit || []) ])
	});
}

/**
 * Searches the specified path for the package root, then returns the directory and parsed
 * `package.json`.
 *
 * @param {String} searchPath - The path to search.
 * @returns {Object}
 */
export function findPackage(searchPath) {
	let clikit = false;
	let json = {};
	let main = null;
	let root = pkgDir.sync(searchPath);

	// don't let the tests think they are cli-kit
	if (root === path.dirname(__dirname)) {
		root = null;
	}

	if (/\.js$/.test(searchPath) && isFile(searchPath)) {
		main = searchPath;
	}

	if (root) {
		const file = path.join(root, 'package.json');
		let contents;

		try {
			contents = fs.readFileSync(file, 'utf8');
		} catch (e) {
			// istanbul ignore next
			throw E.INVALID_PACKAGE_JSON(`Unable to open package.json: ${e.message}`, { name: 'package.json', scope: 'util.findPackage', value: file });
		}

		try {
			json = JSON.parse(contents);
		} catch (e) {
			throw E.INVALID_PACKAGE_JSON(`Failed to parse package.json: ${e.message}`, { file, name: 'package.json.bad', scope: 'util.findPackage', value: contents });
		}

		if (typeof json !== 'object') {
			throw E.INVALID_PACKAGE_JSON('Invalid package.json: expected object', { file, name: 'package.json.invalid', scope: 'util.findPackage', value: json });
		}

		if (json.clikit || json['cli-kit']) {
			clikit = true;
			Object.assign(json, json.clikit, json['cli-kit']);
		}

		if (!main) {
			if (json.main) {
				try {
					main = path.resolve(root, json.main);
					if (fs.statSync(main).isDirectory()) {
						main = path.join(main, 'index.js');
					}
				} catch (e) {
					main = path.resolve(root, `${json.main}.js`);
				}
			} else {
				main = path.resolve(root, 'index.js');
			}

			if (!isFile(main)) {
				main = null;
			}
		}
	} else {
		root = main ? path.dirname(main) : null;
	}

	return { clikit, json, main, root };
}

/**
 * Determines if a file exists and that it is indeed a file.
 *
 * @param {String} file - The file to check.
 * @returns {Boolean}
 */
export function isFile(file) {
	try {
		return fs.statSync(file).isFile();
	} catch (e) {
		// squelch
	}
	return false;
}

/**
 * Inserts line breaks into a string so that the text does not exceed the specified width.
 *
 * @param {String} str - The string to line wrap.
 * @param {Number} [width] - The width to break the lines; defaults to the terminal width.
 * @param {Number} [indent] - The number of spaces to indent new lines.
 * @returns {String}
 */
export function wrap(str, width, indent) {
	if (width <= 0) {
		return str;
	}

	indent = ' '.repeat(indent || 0);

	return str
		.split(/\r?\n/)
		.map(line => {
			let i = 0;
			let j = 0;
			let k;
			let next;

			// remove escape characters
			line = line.replace(/\u001b\[J/g, ''); // eslint-disable-line no-control-regex

			while (i < line.length) {
				i++;
				if (++j >= width) {
					// backpedal
					for (k = i; k >= 0; k--) {
						if (/[ ,;!?]/.test(line.charAt(k)) || (/[.:]/.test(line.charAt(k)) && (k + 1 >= line.length || /[ \t\r\n]/.test(line.charAt(k + 1))))) {
							if (k + 1 < line.length) {
								line = `${line.substring(0, k)}\n${indent}${line.substring(k + 1)}`;
								i = k + 1;
								j = 0;
							}
							break;
						}
					}
				}
			}

			return line;
		})
		.join('\n');
}

/**
 * Overwrites the `write()` method of the supplied streams and the first stream that has data will
 * fire the specified `callback` and render a string, then restore the original writes.
 */
export class WriteInterceptor {
	/**
	 * Wires up the streams.
	 *
	 * @param {Array.<Writable>} streams - An array of one or more streams to intercept.
	 * @param {Function} callback - A function to call when data is written to a stream.
	 * @access public
	 */
	constructor(streams, callback) {
		const dataRegExp = /^\s*[<{[]/;

		this.streams = streams
			.filter(stream => stream)
			.map(stream => {
				const { write } = stream;

				stream.write = (chunk, encoding, cb) => {
					if (typeof encoding === 'function') {
						cb = encoding;
						encoding = null;
					}

					if (typeof cb !== 'function') {
						cb = () => {};
					}

					// restore the original writes
					this.restore();

					if (encoding === 'base64' || encoding === 'binary' || encoding === 'hex') {
						// noop
					} else if (!dataRegExp.test(chunk)) {
						const str = callback();
						if (str) {
							write.call(stream, `${str}\n\n`);
						}
					}

					return write.call(stream, chunk, encoding, cb);
				};

				return {
					stream,
					write
				};
			});
	}

	/**
	 * Restores the original `write()` method for each stream.
	 *
	 * @access public
	 */
	restore() {
		for (const { stream, write } of this.streams) {
			stream.write = write;
		}
	}
}
