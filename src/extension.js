import Command from './command';
import debug from './debug';
import E from './errors';
import fs from 'fs';
import path from 'path';
import which from 'which';

import {
	declareCLIKitClass,
	findPackage
} from './util';

import { spawn } from 'child_process';

const { log } = debug('cli-kit:extension');
const { highlight, note } = debug.styles;

/**
 * Defines a namespace that wraps an external program or script.
 */
export default class Extension extends Command {
	/**
	 * Detects the extension defined in the specified path and initializes it.
	 *
	 * @param {Object} params - Various parameters.
	 * @param {String} params.extensionPath - The path to the extension. The path can be an
	 * executable, a JavaScript file, or Node.js package. If the path is a Node.js package with a
	 * `package.json` containing a `"cli-kit"` propertly, it will merge the external cli-kit context
	 * tree into this namespace.
	 * @param {String} [params.name] - The extension name. If not set, it will load it from the
	 * extension's `package.json` or the filename.
	 * @access public
	 */
	constructor(params = {}) {
		if (!params || typeof params !== 'object' || Array.isArray(params)) {
			throw E.INVALID_ARGUMENT('Expected parameters to be an object or Context', { name: 'params', scope: 'Extension.constructor', value: params });
		}

		let { extensionPath, name, parent } = params;
		let executable = null;
		let pkg = null;
		let isCLIKitExtension = false;

		if (!extensionPath || typeof extensionPath !== 'string') {
			throw E.INVALID_ARGUMENT('Expected extension path to be a non-empty string', { extensionPath, name: 'params.extensionPath', scope: 'Extension.constructor', value: extensionPath });
		}

		name = String(name || '').trim();

		// first see if this is an executable
		try {
			executable = which.sync(extensionPath);
			params.action = ({ _ }) => this.run(_);
		} catch (e) {
			// not an executable,
			if (fs.existsSync(extensionPath)) {
				// check if we have a JavaScript file or Node.js module
				pkg = findPackage(extensionPath);
				if (!pkg.main) {
					throw E.INVALID_EXTENSION(`Unable to find extension's main file: ${extensionPath}`);
				}

				// if there's not an explicit name, then fall back to the name in the package
				if (!name) {
					name = String(pkg.json.name || '').trim();
				}

				if (pkg.clikit) {
					log(`Requiring ${highlight(pkg.main)}`);
					let ctx;
					let err;

					try {
						ctx = require(pkg.main);
					} catch (e) {
						err = e;
					}

					if (ctx && ctx.__esModule) {
						ctx = ctx.default;
					}

					isCLIKitExtension = true;

					if (ctx && typeof ctx === 'object') {
						if (ctx.clikit instanceof Set && (ctx.clikit.has('CLI') || ctx.clikit.has('Command'))) {
							params = ctx;
							params.parent = parent;
							log(`Loaded cli-kit enable extension: ${highlight(pkg.json.name)}`);
						} else {
							isCLIKitExtension = false;
						}

					} else if (params.ignoreInvalidExtensions || (params.parent && params.parent.get('ignoreInvalidExtensions', false))) {
						params.action = () => {
							const out = this.outputStream || process.stdout;
							if (err) {
								out.write(`Bad extension: ${pkg.json.name}\n`);
								out.write(`  ${err.toString()}\n`);
								let { stack } = err;
								const p = stack.indexOf('\n\n');
								if (p !== -1) {
									stack = stack.substring(0, p).trim();
								}
								for (const line of stack.split('\n')) {
									out.write(`  ${line}\n`);
								}
							} else {
								out.write(`Invalid extension: ${pkg.json.name}\n`);
							}
						};

					} else if (err) {
						throw E.INVALID_EXTENSION(`Bad extension: ${pkg.json.name}`, { err, extensionPath, name: 'pkg', scope: 'Extension.constructor', value: pkg });

					} else {
						throw E.INVALID_EXTENSION(`Extension does not export an object: ${extensionPath}`, { extensionPath, name: 'extension.ctx', scope: 'Extension.constructor', value: ctx });
					}
				}

				if (Array.isArray(pkg.json.aliases)) {
					params.aliases = pkg.json.aliases;
				}

				if (pkg.json.description) {
					params.desc = pkg.json.description;
				}
			}
		}

		super(name || path.basename(extensionPath), params);
		declareCLIKitClass(this, 'Extension');

		this.executable    = executable;
		this.pkg           = pkg;

		if (isCLIKitExtension) {
			// nothing to do

		} else if (pkg) {
			this.executable = process.execPath;
			this.action = ({ _ }) => this.run([ this.extensionPath, ..._ ]);
			log(`Loaded extension as Node package: ${highlight(extensionPath)}`);

		} else if (executable) {
			log(`Loaded extension as executable: ${highlight(extensionPath)}`);

		} else if (this.get('ignoreMissingExtensions', false)) {
			this.action = () => {
				const out = this.outputStream || process.stdout;
				out.write(`Extension not found: ${extensionPath}\n`);
			};

			log(`Loaded invalid extension: ${highlight(extensionPath)}`);

		} else {
			throw E.INVALID_EXTENSION(`Extension not found: ${extensionPath}`, { extensionPath, name: 'extension', scope: 'Extension.constructor', value: extensionPath });
		}
	}

	/**
	 * Runs this extension's executable.
	 *
	 * @param {Array.<String>} [args] - An array of arguments to pass into the process.
	 * @returns {Promise}
	 * @access private
	 */
	run(args) {
		return new Promise((resolve, reject) => {
			if (!this.executable) {
				return reject(E.NO_EXECUTABLE('No executable to run', { name: 'executable', scope: 'Extension.run', value: this.executable }));
			}

			const out = this.outputStream;
			const stdout = out || process.stdout;
			const stderr = out || process.stderr;

			log(`Running: ${this.executable} ${args.join(' ')}`);
			const child = spawn(this.executable, args);

			child.stdout.on('data', data => stdout.write(data.toString()));
			child.stderr.on('data', data => stderr.write(data.toString()));

			child.on('close', (code = 0) => resolve({ code }));
		});
	}
}
