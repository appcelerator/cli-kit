import Command from './command';
import debug from '../lib/debug';
import E from '../lib/errors';
import helpCommand from '../commands/help';

import { declareCLIKitClass, filename, findPackage, isExecutable } from '../lib/util';
import { spawn } from 'child_process';

const { log, warn } = debug('cli-kit:extension');
const { highlight, note } = debug.styles;

/**
 * Defines a namespace that wraps an external program or script.
 *
 * @extends {Command}
 */
export default class Extension extends Command {
	/**
	 * Set to `true` if this extension is a cli-kit extension. It shall remain `false` for native
	 * binaries and non-cli-kit CLI's.
	 * @type {Boolean}
	 */
	isCLIKitExtension = false;

	/**
	 * Detects the extension defined in the specified path and initializes it.
	 *
	 * @param {String|Object} pathOrParams - The path to the extension or a params object. If the
	 * path is a Node.js package with a `package.json` containing a `"cli-kit"` property, it will
	 * merge the external cli-kit context tree into this namespace.
	 * @param {Object} [params] - Various parameters when `extensionPath` is a `String`.
	 * @param {String} [params.name] - The extension name. If not set, it will load it from the
	 * extension's `package.json` or the filename.
	 * @param {String} [params.path] - The path to an executable, a JavaScript file, or Node.js
	 * package.
	 * @access public
	 */
	constructor(pathOrParams, params) {
		let path = null;

		if (typeof pathOrParams === 'string') {
			path = pathOrParams;
			if (!params) {
				params = {};
			}
		} else if (pathOrParams && typeof pathOrParams === 'object') {
			({ path } = params = pathOrParams);
		}

		if (!path || typeof path !== 'string') {
			throw E.INVALID_ARGUMENT('Expected an extension path or params object', { name: 'pathOrParams', scope: 'Extension.constructor', value: pathOrParams });
		}

		if (typeof params !== 'object') {
			throw E.INVALID_ARGUMENT('Expected extension params to be an object or Context', { name: 'params', scope: 'Extension.constructor', value: params });
		}

		let { name } = params;
		let err;
		let exe;
		let pkg;

		// we always implement our own action
		delete params.action;

		// we need to determine if this extension is a binary or if it's a Node package
		try {
			exe = isExecutable(path);
			if (!name) {
				name = filename(exe[0]);
			}
		} catch (e) {
			// maybe a Node package?
			try {
				try {
					pkg = findPackage(path);
					if (!pkg.root) {
						throw new Error();
					}
				} catch (e) {
					throw E.INVALID_EXTENSION(`Invalid extension: Unable to find executable, script, or package: ${typeof path === 'string' ? `"${path}"` : JSON.stringify(path)}`);
				}

				if (!pkg.main) {
					throw E.INVALID_EXTENSION(`Invalid extension: Unable to find extension's main file: ${typeof path === 'string' ? `"${path}"` : JSON.stringify(path)}`);
				}

				if (!params.desc) {
					params.desc = pkg.json.description;
				}

				if (!name) {
					name = pkg.json.name;
				}

				// init the aliases with any aliases from the package.json
				params.aliases = Array.isArray(pkg.json.aliases) ? pkg.json.aliases : [];

				// if the name is different than the one in the package.json, add it to the aliases
				if (params.name && params.name !== pkg.json.name && !params.aliases.includes(params.name)) {
					params.aliases.push(params.name);
				}

				// if the package has a bin script that matches the package name, then add any other
				// bin name that aliases the package named bin
				if (pkg.json.bin) {
					const primary = pkg.json.bin[pkg.json.name];
					for (const [ name, bin ] of Object.entries(pkg.json.bin)) {
						if (bin === primary && !params.aliases.includes(name)) {
							params.aliases.push(name);
						}
					}
				}
			} catch (e) {
				err = e;
				warn(err.message);
				warn('Found bad extension, creating error action');

				params.action = () => {
					const { stderr } = this.get('terminal');
					if (err) {
						let { stack } = err;
						const p = stack.indexOf('\n\n');
						if (p !== -1) {
							stack = stack.substring(0, p).trim();
						}
						for (const line of stack.split('\n')) {
							stderr.write(`  ${line}\n`);
						}
					} else {
						stderr.write(`Invalid extension: ${pkg.json.name}\n`);
					}
				};
			}
		}

		super(name || filename(path), params);
		declareCLIKitClass(this, 'Extension');

		this.err    = err;
		this.exe    = exe;
		this.path   = path;
		this.pkg    = pkg;
	}

	/**
	 * Loads the extension.
	 *
	 * @param {Array.<String>} [args] - A list of args to append to the executable args.
	 * @returns {Promise}
	 * @access public
	 */
	async load(args) {
		if (this.loaded) {
			return;
		}
		this.loaded = true;

		let { exe, pkg } = this;

		// if we have a JavaScript file or Node package, but not a cli-kit enabled one, then wire
		// it up to spawn Node
		if (pkg && pkg.root && !pkg.clikit) {
			exe = this.exe = [ process.execPath, pkg.main ];
		}

		if (exe) {
			if (Array.isArray(args)) {
				// append any parsed args to the existing executable and args
				exe.push.apply(exe, args);
			}

			this.action = async () => {
				if (Array.isArray(this.exe)) {
					const { stderr, stdin, stdout } = this.get('terminal');
					const stdio = [
						!this.isCLIKitExtension || stdin === process.stdin   ? 'inherit' : 'pipe',
						!this.isCLIKitExtension || stdout === process.stdout ? 'inherit' : 'pipe',
						!this.isCLIKitExtension || stderr === process.stderr ? 'inherit' : 'pipe'
					];

					log(`Running: ${highlight(this.exe.join(' '))} ${note(JSON.stringify(stdio))}`);
					const child = spawn(this.exe[0], this.exe.slice(1), { stdio });

					if (stdio[1] === 'pipe') {
						child.stdout.pipe(stdout);
					}
					if (stdio[2] === 'pipe') {
						child.stderr.pipe(stderr);
					}

					await new Promise(resolve => child.on('close', (code = 0) => resolve({ code })));

				} else {
					throw E.NO_EXECUTABLE(`Extension "${this.name}" has no executable!`);
				}
			};

		} else if (pkg && pkg.clikit) {
			// we have a Node package, so require it and see what we have
			log(`Requiring ${highlight(pkg.main)}`);

			let ctx;
			try {
				ctx = require(pkg.main);
				if (!ctx || (typeof ctx !== 'object' && typeof ctx !== 'function')) {
					throw new Error('Extension must export an object or function');
				}
			} catch (err) {
				throw E.INVALID_EXTENSION(`Bad extension "${this.name}": ${err.message}`, { name: this.name, path: this, scope: 'Extension.load', value: err });
			}

			// if this is an ES6 module, grab the default export
			if (ctx.__esModule) {
				ctx = ctx.default;
			}

			// if the export was a function, call it now to get its CLI definition
			try {
				if (typeof ctx === 'function') {
					ctx = await ctx();
				}

				if (!ctx || typeof ctx !== 'object') {
					throw new Error('Extension does not resolve an object');
				}
			} catch (err) {
				throw E.INVALID_EXTENSION(`Bad extension "${this.name}": ${err.message}`, { name: this.name, path: this, scope: 'Extension.load', value: err });
			}

			this.isCLIKitExtension = true;

			this.aliases        = ctx.aliases;
			this.banner         = ctx.banner;
			this.camelCase      = ctx.camelCase;
			this.defaultCommand = ctx.defaultCommand;
			this.treatUnknownOptionsAsArguments = ctx.treatUnknownOptionsAsArguments;
			this.version        = ctx.version;

			this.init({
				args:       ctx.args,
				commands:   ctx.commands,
				desc:       this.desc || ctx.desc,
				extensions: ctx.extensions,
				name:       this.name || ctx.name,
				options:    ctx.options,
				parent:     this.parent,
				title:      ctx.title !== 'Global' && ctx.title || this.name
			});

			const versionOption = this.version && this.lookup.long.version;
			if (versionOption && typeof versionOption.callback !== 'function') {
				versionOption.callback = async ({ exitCode, opts, next }) => {
					if (await next()) {
						let version = this.version;
						if (typeof version === 'function') {
							version = await version(opts);
						}
						(opts.terminal || this.get('terminal')).stdout.write(`${version}\n`);
						exitCode(0);
						return false;
					}
				};
			}

			if (typeof ctx.action === 'function') {
				this.action = ctx.action;
			} else {
				this.action = parser => {
					if (this.defaultCommand !== 'help' || !this.get('help')) {
						const cmd = this.defaultCommand && this.commands[this.defaultCommand];
						if (cmd) {
							return cmd.action(parser);
						}
					}
					return helpCommand.action(parser);
				};
			}
		}
	}

	/**
	 * Returns the schema for this extension and all child contexts.
	 *
	 * @returns {Object}
	 * @access public
	 */
	schema() {
		return {
			...super.schema,
			path: this.path
		};
	}
}
