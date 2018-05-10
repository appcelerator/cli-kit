import fs from 'fs';
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
		try {
			json = JSON.parse(fs.readFileSync(path.join(root, 'package.json')));
		} catch (e) {
			throw new Error(`Failed to parse package.json: ${e.message}`);
		}

		if (typeof json !== 'object') {
			throw new TypeError('Invalid package.json: expected object');
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
		root = path.dirname(main);
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

			while (i < line.length) {
				if (line.charAt(i) === '\u001b') {
					// fast forward!
					i += 5;
				} else {
					i++;
					if (++j >= width) {
						// backpedal
						for (k = i; k >= 0; k--) {
							if (/[ ,;!?]/.test(line[k]) || (/[.:]/.test(line[k]) && (k + 1 >= line.length || /[ \t\r\n]/.test(line[k + 1])))) {
								if (k + 1 < line.length) {
									line = line.substring(0, k) + '\n' + indent + line.substring(k + 1);
									i = k + 1;
									j = 0;
								}
								break;
							}
						}
					}
				}
			}

			return line;
		})
		.join('\n');
}
