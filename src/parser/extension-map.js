import E from '../lib/errors.js';
import Extension from './extension.js';
import { declareCLIKitClass } from '../lib/util.js';

/**
 * Stores a map of `Extension` instances that have been registered for a context.
 *
 * @extends {Map}
 */
export default class ExtensionMap extends Map {
	/**
	 * Declares the class name.
	 *
	 * @access public
	 */
	constructor() {
		super();
		declareCLIKitClass(this, 'ExtensionMap');
	}

	/**
	 * Adds an extension to the map.
	 *
	 * @param {Object|String|Extension|ExtensionMap|Array.<String|Extension>} ext - An object of
	 * extension names to extension paths or instances, an extension path, an `Extension` instance,
	 * or an array of those types. An extension path may be a directory containing a Node.js
	 * module, a path to a `.js` file, or the name of a executable. May also be an `ExtensionMap`
	 * instance.
	 * @param {String} [name] - The extension name used for the context name. If not set, it will
	 * attempt to find a `package.json` with a `cli-kit.name` value.
	 * @param {Boolean} [clone] - When `true` and `ext` is an `Extension` or `ExtensionMap`, it
	 * will clone the `Extension` instead of set by reference.
	 * @returns {Array.<Extension>}
	 * @access public
	 *
	 * @example
	 *   .add({ foo: '/path/to/ext', bar: new Extension() })
	 *   .add('/path/to/ext');
	 *   .add('/path/to/ext', 'foo');
	 *   .add(new Extension())
	 *   .add(new ExtensionMap())
	 *   .add([ '/path/to/ext', new Extension() ])
	 */
	add(ext, name, clone) {
		if (!ext) {
			throw E.INVALID_ARGUMENT('Expected extension to be an extension instance or a path', { name: 'ext', scope: 'ExtensionMap.add', value: ext });
		}

		if (name && typeof name !== 'string') {
			throw E.INVALID_ARGUMENT('Expected extension name to be a string', { name: 'name', scope: 'ExtensionMap.add', value: name });
		}

		const results = [];
		const extensions = typeof ext === 'object'
			? (
				ext.clikit instanceof Set && ext.clikit.has('Extension')
					? [ ext ]
					: ext.clikit instanceof Set && ext.clikit.has('ExtensionMap')
						? ext.entries()
						: Object.entries(ext)
			)
			: Array.isArray(ext) ? ext : [ ext ];

		// at this point, we have an array of `Strings` (paths), Array [name,ext], and Extension instances

		for (let it of extensions) {
			let ext = null;

			if (!clone && it instanceof Extension) {
				ext = it;
			} else if (Array.isArray(it)) {
				// [name,ext]
				const [ name, pathOrExt ] = it;
				ext = pathOrExt instanceof Extension ? pathOrExt : new Extension(pathOrExt, { name });
			} else if (it && (typeof it === 'string' || (typeof it === 'object' && it.clikit instanceof Set && it.clikit.has('Extension')))) {
				// path or params
				ext = new Extension(it, { name });
			}

			if (ext) {
				for (const ctxName of Object.keys(ext.exports)) {
					this.set(ctxName, ext);
				}
				results.push(ext);
			} else {
				throw E.INVALID_ARGUMENT(`Invalid extension "${it}", expected a valid path or an object`, { name: 'extension', scope: 'ExtensionMap.add', value: it });
			}
		}

		return results;
	}

	/**
	 * Returns the number of extensions.
	 *
	 * @returns {Number}
	 * @access public
	 */
	get count() {
		return this.size;
	}

	/**
	 * Generates an object containing the extensions for the help screen.
	 *
	 * @returns {Promise<Object>}
	 * @access public
	 */
	async generateHelp() {
		const entries = [];

		for (const ctxName of Array.from(this.keys())) {
			const { aliases, clikitHelp, desc, hidden, name } = this.get(ctxName).exports[ctxName];
			if (!hidden && !clikitHelp) {
				const labels = new Set([ name ]);

				for (const [ alias, display ] of Object.entries(aliases)) {
					if (display === 'visible') {
						labels.add(alias);
					}
				}

				entries.push({
					name,
					desc,
					label: Array.from(labels).sort((a, b) => {
						return a.length === b.length ? a.localeCompare(b) : a.length - b.length;
					}).join(', '),
					aliases: aliases ? Object.keys(aliases) : null
				});
			}
		}

		entries.sort((a, b) => a.label.localeCompare(b.label));

		return {
			count: entries.length,
			entries
		};
	}
}
