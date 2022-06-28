import Command from './command.js';
import debug from '../lib/debug.js';
import E from '../lib/errors.js';
import helpCommand from '../commands/help.js';
import _path from 'path';

import { declareCLIKitClass, filename, findPackage, isExecutable } from '../lib/util.js';
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
	 * Detects the extension defined in the specified path and initializes it.
	 *
	 * @param {String|Object} pathOrParams - The path to the extension or a params object. If the
	 * path is a Node.js package with a `package.json` containing a `"cli-kit"` property, it will
	 * merge the external cli-kit context tree into this namespace.
	 * @param {Object} [params] - Various parameters when `extensionPath` is a `String`.
	 * @param {Object} [params.exports] - A map of exported command names to descriptors containing
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

		if (!path || typeof path !== 'string') {
			throw E.INVALID_ARGUMENT('Expected an extension path or params object', { name: 'pathOrParams', scope: 'Extension.constructor', value: pathOrParams });
		}

		if (typeof params !== 'object') {
			throw E.INVALID_ARGUMENT('Expected extension params to be an object or Context', { name: 'params', scope: 'Extension.constructor', value: params });
		}

		this.exports = params.exports || {};
		this.name = params.name;
		this.path = path;

		if (typeof this.exports !== 'object') {
			throw E.INVALID_ARGUMENT('Expected extension exports to be an object', { name: 'params.exports', scope: 'Extension.constructor', value: params.exports });
		}

		// we need to determine if this extension is a binary or if it's a Node package
		try {
			const exe = isExecutable(path);
			if (!this.name) {
				this.name = filename(exe[0]);
			}

			this.registerExtension(this.name, { exe }, {
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
				desc: params.desc
			});
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

				if (!this.name) {
					this.name = filename(path);
				}

				const makeDefaultAction = main => {
					return async ({ __argv, cmd }) => {
						process.argv = [
							process.execPath,
							main
						];

						const p = __argv.findIndex(arg => arg && arg.type === 'extension' && arg.command === cmd);
						if (p !== -1) {
							for (let i = p + 1, len = __argv.length; i < len; i++) {
								process.argv.push.apply(process.argv, __argv[i].input);
							}
						}

						log(`Requiring ${highlight(main)}`);
						log(`Args: ${highlight(process.argv.join(' '))}`);
						require(main);
					};
				};

				if (!pkg.json.exports && pkg.main) {
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
					if (pkg.json.bin && typeof pkg.json.bin === 'object') {
						const bins = Object.keys(pkg.json.bin);
						const primary = pkg.json.bin[pkg.json.name] || (bins && pkg.json.bin[bins[0]]);
						for (const [ name, bin ] of Object.entries(pkg.json.bin)) {
							if (bin !== primary && !aliases.includes(name)) {
								aliases.push(name);
							}
						}
					}

					this.registerExtension(name, { pkg }, {
						action: makeDefaultAction(pkg.main),
						aliases,
						desc: pkg.json.description
					});
				} else if (typeof pkg.json.exports !== 'object') {
					throw E.INVALID_EXTENSION('Invalid extension: Expected exports to be an object', { name: 'pkg.json.exports', scope: 'Extension.constructor', value: pkg.json.exports });
				} else {
					for (let [ name, params ] of Object.entries(pkg.json.exports)) {
						if (typeof params === 'string') {
							params = { main: params };
						}
						if (params.main && !_path.isAbsolute(params.main)) {
							params.main = _path.resolve(pkg.root, params.main);
						}
						this.registerExtension(name, {
							pkg: {
								...pkg,
								...params
							}
						}, {
							action: makeDefaultAction(params.main),
							desc: pkg.json.description,
							...params
						});
					}
				}

				if (!Object.keys(this.exports).length) {
					throw E.INVALID_EXTENSION(`Invalid extension: Unable to find extension's main file: ${typeof path === 'string' ? `"${path}"` : JSON.stringify(path)}`);
				}
			} catch (e) {
				this.err = e;
				warn(e);
				warn('Found bad extension, creating error action');

				this.registerExtension(this.name, {}, {
					action: ({ terminal }) => {
						const { stderr } = terminal;
						if (this.err) {
							let { stack } = e;
							const p = stack.indexOf('\n\n');
							if (p !== -1) {
								stack = stack.substring(0, p).trim();
							}
							for (const line of stack.split('\n')) {
								stderr.write(`  ${line}\n`);
							}
						} else {
							stderr.write(`Invalid extension: ${this.name}\n`);
						}
					}
				});
			}
		}

		declareCLIKitClass(this, 'Extension');

		// mix in any other custom props
		for (const [ key, value ] of Object.entries(params)) {
			if (!Object.prototype.hasOwnProperty.call(this, key)) {
				this[key] = value;
			}
		}
	}

	/**
	 * Initializes a command with the extension export info.
	 *
	 * @param {String} name - The command name.
	 * @param {Object} meta - Metadata to mix into the command instance.
	 * @param {Object} params - Command specific constructor parameters.
	 * @access private
	 */
	registerExtension(name, meta, params) {
		log(`Registering extension command: ${highlight(`${this.name}:${name}`)}`);
		const cmd = new Command(name, {
			parent: this,
			...params
		});
		this.exports[name] = Object.assign(cmd, meta);
		cmd.isExtension = true;
		cmd.isCLIKitExtension = !!meta?.pkg?.clikit;

		if (!cmd.isCLIKitExtension || !meta.pkg.json.dependencies?.['cli-kit']) {
			return;
		}

		// we only want to define `cmd.load()` if main exports a cli-kit object

		cmd.load = async function load() {
			log(`Requiring cli-kit extension: ${highlight(this.name)} -> ${highlight(meta.pkg.main)}`);
			let ctx;
			try {
				ctx = require(meta.pkg.main);
				if (!ctx || (typeof ctx !== 'object' && typeof ctx !== 'function')) {
					throw new Error('Extension must export an object or function');
				}

				// if this is an ES6 module, grab the default export
				if (ctx.__esModule) {
					ctx = ctx.default;
				}

				// if the export was a function, call it now to get its CLI definition
				if (typeof ctx === 'function') {
					ctx = await ctx(this);
				}
				if (!ctx || typeof ctx !== 'object') {
					throw new Error('Extension does not resolve an object');
				}
			} catch (err) {
				throw E.INVALID_EXTENSION(`Bad extension "${this.name}": ${err.message}`, { name: this.name, scope: 'Extension.load', value: err });
			}

			this.aliases                        = ctx.aliases;
			this.camelCase                      = ctx.camelCase;
			this.defaultCommand                 = ctx.defaultCommand;
			this.help                           = ctx.help;
			this.remoteHelp                     = ctx.remoteHelp;
			this.treatUnknownOptionsAsArguments = ctx.treatUnknownOptionsAsArguments;
			this.version                        = ctx.version;

			this.init({
				args:       ctx.args,
				banner:     ctx.banner,
				commands:   ctx.commands,
				desc:       ctx.desc || this.desc,
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
						let { version } = this;
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
				this.action = async parser => {
					if (this.defaultCommand !== 'help' || !this.get('help')) {
						const defcmd = this.defaultCommand && this.commands[this.defaultCommand];
						if (defcmd) {
							return await defcmd.action.call(defcmd, parser);
						}
					}
					return await helpCommand.action.call(helpCommand, parser);
				};
			}
		}.bind(cmd);
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
