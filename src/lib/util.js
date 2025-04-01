import argvSplit from 'argv-split';
import fs from 'fs-extra';
import E from './errors.js';
import path from 'path';
import os from 'os';
import semver from 'semver';
import which from 'which';
import child_process from 'child_process';
import { fileURLToPath } from 'url';
import { packageDirectorySync } from 'pkg-dir';
import { execPath } from 'process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * The required Node.js version for cli-kit. This is used to assert the Node version at runtime.
 * If the `CLI` instance is created with a `nodeVersion`, then it assert the greater of the two
 * Node versions.
 *
 * @type {String}
 */
const clikitNodeVersion = fs.readJsonSync(path.resolve(__dirname, '..', '..', 'package.json')).engines.node;

/**
 * Asserts that the current Node.js version meets the requirements of cli-kit as well as the app.
 *
 * @param {Object} opts - Various options.
 * @param {String} [opts.appName] - The name of the app.
 * @param {String} [opts.nodeVersion] - The required Node.js version.
 */
export function assertNodeJSVersion({ appName, nodeVersion }) {
	const { version: current } = process;
	let required;

	if (!semver.satisfies(current, clikitNodeVersion)) {
		required = clikitNodeVersion;
	} else if (nodeVersion && !semver.satisfies(current, nodeVersion)) {
		required = nodeVersion;
	}

	if (required) {
		throw E.INVALID_NODE_JS(`${appName !== 'program' && appName || 'This program'} requires Node.js version ${required}, currently ${current}`, {
			current,
			required
		});
	}
}

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
 * Decodes a value.
 *
 * @param {String} value - The value to decode.
 * @returns {*}
 */
export function decode(value) {
	return value === undefined || value === null ? '' : JSON.parse(Buffer.from(value, 'base64').toString('utf8'));
}

export { decode as decodeHeader };

/**
 * Encodes a JavaScript value using base64.
 *
 * @param {*} it - A value to encode.
 * @returns {String}
 */
export function encode(it) {
	return it === undefined || it === null ? it : Buffer.from(JSON.stringify(it), 'utf8').toString('base64');
}

export { encode as encodeHeader };

/**
 * Strips off the file extension and returns the filename.
 *
 * @param {String} file - The file to extract the filename from.
 * @returns {String}
 */
export function filename(file) {
	return path.basename(file).replace(/\.[^.]+$/, '');
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
	let root = packageDirectorySync({ cwd: searchPath }) || null;
	let esm = false;

	// don't let the tests think they are cli-kit
	if (root === path.resolve(__dirname, '..', '..')) {
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

		// detect if we have an ES module
		esm = json.type === 'module';

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

	return { clikit, esm, json, main, root };
}

/**
 * Attempts to determine if the specified string is an executable.
 *
 * @param {String} bin - An executable name, path, or entire command.
 * @returns {Array.<String>}
 */
export function isExecutable(bin) {
	let args;

	try {
		args = split(bin);
		bin = args.shift();
	} catch (err) {
		// this shouldn't happen, but if it does, just fallback to the original value
	}

	return [
		which.sync(bin),
		...args
	];
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
 * Splits an argv (argument vector) string.
 *
 * This function is just a wrapper around argv-split just in case we ever want to replace it.
 * https://www.npmjs.com/package/argv-split.
 *
 * @param {String} it - The argv string to split.
 * @returns {Array.<String>}
 */
export function split(it) {
	return argvSplit(it);
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

// cache to avoid extra lookups
let _nodePath;
export function nodePath() {
	if (!_nodePath) {
		const execPath = process.execPath;
		// cannot exec cmd on windows on new versions of node https://nodejs.org/en/blog/vulnerability/april-2024-security-releases-2
		// CVE-2024-27980. Can't pass shell: true to get around this on windows since it breaks non-shell executions.
		// Can't imagine node would be a bat but who knows. It's .cmd on windows often.
		if (os.platform() === 'win32' && [ 'cmd', 'bat' ].includes(path.extname(execPath))) {
			// try and see if the node.exe lives in the same dir
			const newNodePath = execPath.replace(new RegExp(`${path.extname(execPath)}$`), 'exe');
			try {
				fs.statSync(newNodePath);
				_nodePath = newNodePath;
			} catch (err) {
				_nodePath = 'node.exe';
			}
		} else {
			_nodePath = execPath;
		}
	}
	return _nodePath;
}
