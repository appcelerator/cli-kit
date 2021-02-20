import Command from './command';
import debug from '../lib/debug';
import E from '../lib/errors';
import helpCommand from '../commands/help';

import { declareCLIKitClass, filename, findPackage, isExecutable } from '../lib/util';
import { spawn } from 'child_process';

const { log, warn } = debug('cli-kit:extension');
const { highlight } = debug.styles;

const nameRegExp = /^(?:(@\w+)\/)?(.*)$/;

/**
 * Defines a namespace that wraps an external program or script.
 *
 * @extends {Command}
 */
export default class Extension {
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
	 * @param {Object} [params.contexts] - A map of context names to descriptors containing
	 * `aliases`, `desc`, `exe`, `main`, and `name` props.
	 * @param {String} [params.name] - The extension name. If not set, it will load it from the
	 * extension's `package.json` or the filename.
	 * @param {String} [params.path] - The path to an executable, a JavaScript file, or Node.js
	 * package.
	 * @access public
	 */
	constructor(pathOrParams, params) {
		let path = pathOrParams;

		if (typeof path === 'string' && !params) {
			params = {};
		} else if (pathOrParams && typeof pathOrParams === 'object') {
			({ path } = params = pathOrParams);
		}

		this.contexts = params.contexts || {};
		this.name = params.name;
		this.path = path;

		if (!path || typeof path !== 'string') {
			throw E.INVALID_ARGUMENT('Expected an extension path or params object', { name: 'pathOrParams', scope: 'Extension.constructor', value: pathOrParams });
		}

		if (typeof params !== 'object') {
			throw E.INVALID_ARGUMENT('Expected extension params to be an object or Context', { name: 'params', scope: 'Extension.constructor', value: params });
		}

		if (typeof this.contexts !== 'object') {
			throw E.INVALID_ARGUMENT('Expected extension contexts to be an object', { name: 'params.contexts', scope: 'Extension.constructor', value: params.contexts });
		}

		// we need to determine if this extension is a binary or if it's a Node package
		try {
			const exe = isExecutable(path);
			if (!this.name) {
				this.name = filename(exe[0]);
			}
			const cmd = new Command(this.name, {
				action: async ({ __argv, cmd, terminal }) => {
					if (!Array.isArray(exe)) {
						throw E.NO_EXECUTABLE(`Extension "${this.name}" has no executable!`);
					}

					const bin = exe[0];
					const args = exe.slice(1);
					const p = __argv.findIndex(arg => arg && arg.type === 'extension' && arg.command === cmd);

					if (p !== -1) {
						for (let i = p + 1, len = __argv.length; i < len; i++) {
							args.push.apply(args, __argv[i].input);
						}
					}

					// spawn the process
					log(`Running: ${highlight(`${bin} ${args.join(' ')}`)}`);
					const child = spawn(bin, args, { windowsHide: true });
					child.stdout.on('data', data => terminal.stdout.write(data.toString()));
					child.stderr.on('data', data => terminal.stderr.write(data.toString()));
					await new Promise(resolve => child.on('close', (code = 0) => resolve({ code })));
				},
				desc: params.desc,
				parent: this
			});
			cmd.exe = exe;
			cmd.loaded = true;
			cmd.path = path;
			this.contexts[this.name] = cmd;
		} catch (e) {
			// maybe a Node package?
			try {
				let pkg;
				try {
					pkg = findPackage(path);
					if (!pkg.root) {
						throw new Error();
					}
				} catch (e) {
					throw E.INVALID_EXTENSION(`Invalid extension: Unable to find executable, script, or package: ${typeof path === 'string' ? `"${path}"` : JSON.stringify(path)}`);
				}

				if (!this.name) {
					this.name = pkg.json.name;
				}

				if (!pkg.json.contexts && pkg.main) {
					// legacy Node.js extension
					let { name } = this;
					const aliases = Array.isArray(pkg.json.aliases) ? pkg.json.aliases : [];

					// if the package name contains a scope, add the scoped package name as a hidden
					// alias and strip the scope from the name
					const m = name.match(nameRegExp);
					if (m) {
						aliases.push(`!${name}`);
						name = m[2];
					}

					// if the name is different than the one in the package.json, add it to the aliases
					if (name && name !== pkg.json.name && !aliases.includes(name)) {
						aliases.push(name);
					}

					// if the package has a bin script that matches the package name, then add any other
					// bin name that aliases the package named bin
					if (pkg.json.bin) {
						const primary = pkg.json.bin[pkg.json.name];
						for (const [ name, bin ] of Object.entries(pkg.json.bin)) {
							if (bin === primary && !aliases.includes(name)) {
								aliases.push(name);
							}
						}
					}

					this.registerNodeExtension(name, pkg, { aliases });
				} else if (typeof pkg.json.contexts !== 'object') {
					throw E.INVALID_EXTENSION('Invalid extension: Expected contexts to be an object', { name: 'pkg.json.contexts', scope: 'Extension.constructor', value: pkg.json.contexts });
				} else {
					for (const [ name, info ] of Object.entries(pkg.json.contexts)) {
						this.registerNodeExtension(name, pkg, info);
					}
				}

				if (!Object.keys(this.contexts).length) {
					throw E.INVALID_EXTENSION(`Invalid extension: Unable to find extension's main file: ${typeof path === 'string' ? `"${path}"` : JSON.stringify(path)}`);
				}
			} catch (e) {
				this.err = e;
				warn(e.message);
				warn('Found bad extension, creating error action');

				// params.action = () => {
				// 	const { stderr } = this.get('terminal');
				// 	if (err) {
				// 		let { stack } = err;
				// 		const p = stack.indexOf('\n\n');
				// 		if (p !== -1) {
				// 			stack = stack.substring(0, p).trim();
				// 		}
				// 		for (const line of stack.split('\n')) {
				// 			stderr.write(`  ${line}\n`);
				// 		}
				// 	} else {
				// 		stderr.write(`Invalid extension: ${pkg.json.name}\n`);
				// 	}
				// };
			}
		}

		declareCLIKitClass(this, 'Extension');
	}

	registerNodeExtension(name, pkg, params) {
		const cmd = new Command(name, {
			desc: pkg.json.description,
			...params
		});
		cmd.pkg = pkg;
		this.contexts[name] = cmd;
	}

	/**
	 * Loads the extension.
	 *
	 * @param {String} name - The name of the context to load.
	 * @returns {Promise}
	 * @access public
	 */
	async load(name) {
		log(`Loading extension: ${highlight(`${this.name}:${name}`)}`);
		const cmd = this.contexts[name];
		if (!cmd) {
			throw new Error(`Unknown extension context "${name}"`);
		}

		if (cmd.loaded) {
			return;
		}
		cmd.loaded = true;

		let { pkg } = cmd;

		if (pkg?.root && !pkg.clikit) {
			// we have a non-cli-kit enabled Node package
			cmd.action = async ({ __argv, cmd }) => {
				process.argv = [
					process.execPath,
					pkg.main
				];

				const p = __argv.findIndex(arg => arg && arg.type === 'extension' && arg.extension === cmd);
				if (p !== -1) {
					for (let i = p + 1, len = __argv.length; i < len; i++) {
						process.argv.push.apply(process.argv, __argv[i].input);
					}
				}

				log(`Requiring ${highlight(pkg.main)}`);
				require(pkg.main);
			};

		} else if (pkg?.clikit) {
			// we have a Node package, so require it and see what we have
			let ctx;
			try {
				log(`Requiring ${highlight(pkg.main)}`);
				ctx = require(pkg.main);
				if (!ctx || (typeof ctx !== 'object' && typeof ctx !== 'function')) {
					throw new Error('Extension must export an object or function');
				}

				// if this is an ES6 module, grab the default export
				if (ctx.__esModule) {
					ctx = ctx.default;
				}

				// if the export was a function, call it now to get its CLI definition
				if (typeof ctx === 'function') {
					ctx = await ctx(cmd);
				}
				if (!ctx || typeof ctx !== 'object') {
					throw new Error('Extension does not resolve an object');
				}
			} catch (err) {
				throw E.INVALID_EXTENSION(`Bad extension "${cmd.name}": ${err.message}`, { name: cmd.name, path: cmd, scope: 'Extension.load', value: err });
			}

			cmd.isCLIKitExtension = true;

			cmd.aliases        = ctx.aliases;
			cmd.camelCase      = ctx.camelCase;
			cmd.defaultCommand = ctx.defaultCommand;
			cmd.remoteHelp     = ctx.remoteHelp;
			cmd.treatUnknownOptionsAsArguments = ctx.treatUnknownOptionsAsArguments;
			cmd.version        = ctx.version;

			cmd.init({
				args:       ctx.args,
				banner:     ctx.banner,
				commands:   ctx.commands,
				desc:       cmd.desc || ctx.desc,
				extensions: ctx.extensions,
				name:       cmd.name || ctx.name,
				options:    ctx.options,
				parent:     this.parent,
				title:      ctx.title !== 'Global' && ctx.title || this.name
			});

			const versionOption = cmd.version && cmd.lookup.long.version;
			if (versionOption && typeof versionOption.callback !== 'function') {
				versionOption.callback = async ({ exitCode, opts, next }) => {
					if (await next()) {
						let version = cmd.version;
						if (typeof version === 'function') {
							version = await version(opts);
						}
						(opts.terminal || cmd.get('terminal')).stdout.write(`${version}\n`);
						exitCode(0);
						return false;
					}
				};
			}

			if (typeof ctx.action === 'function') {
				cmd.action = ctx.action;
			} else {
				cmd.action = parser => {
					if (cmd.defaultCommand !== 'help' || !cmd.get('help')) {
						const defcmd = cmd.defaultCommand && cmd.commands[cmd.defaultCommand];
						if (defcmd) {
							return defcmd.action(parser);
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
