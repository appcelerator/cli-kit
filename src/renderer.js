import E from './errors';
import MarkdownIt from 'markdown-it';

/**
 * Renders markdown to CLI friendly output.
 */
export default class Renderer {
	/**
	 * Initializes the renderer and validates the options. It creates the markdown engine if it's
	 * not custom or disabled.
	 *
	 * @param {Object} [opts] - Various options.
	 * @param {MarkdownIt} [opts.md] - A custom markdown-it instance. If not specified, a default
	 * one is created.
	 * @param {Object} [opts.mdOpts] - Custom markdown-it options.
	 * @param {Array.<Array|Function>} [opts.plugins] - An array of markdown-it plugins.
	 * @param {Number} [opts.width] - The maximum width of the rendered output before wrapping the
	 * output.
	 * @access public
	 */
	constructor(opts = {}) {
		if (typeof opts !== 'object') {
			throw E.INVALID_ARGUMENT('Expected format options to be an object', { name: 'opts', scope: 'Renderer.constructor', value: opts });
		}

		this.md = opts.md;
		if (this.md === undefined) {
			this.md = new MarkdownIt('default', opts.mdOpts);
		}

		// init the markdown plugins
		if (this.md) {
			if (opts.plugins) {
				if (!Array.isArray(opts.plugins)) {
					throw E.INVALID_ARGUMENT('Expected format plugins to be an array of plugin definitions', { name: 'plugins', scope: 'Renderer.constructor', value: opts.plugins });
				}

				for (const plugin of opts.plugins) {
					if (plugin) {
						if (Array.isArray(plugin) && typeof plugin[0] === 'function') {
							this.md.use.apply(this.md, plugin);
						} else if (typeof plugin === 'function') {
							this.md.use(plugin);
						} else {
							throw E.INVALID_ARGUMENT(`Invalid format plugin: ${plugin}`, { name: 'plugin', scope: 'Renderer.constructor', value: plugin });
						}
					}
				}
			}

			// TODO: mix in our custom plugins
		}

		if (opts.width !== undefined && typeof opts.width !== 'number') {
			throw E.INVALID_ARGUMENT('Expected format width to be a number', { name: 'width', scope: 'Renderer.constructor', value: opts.width });
		}
		this.width = opts.width || 100;
	}

	/**
	 * Renders as a string containing markdown.
	 *
	 * @param {String} str - A string to render.
	 * @returns {String}
	 * @access public
	 */
	render(str) {
		if (!this.md) {
			return str;
		}

		const render = tokens => {
			let result = '';

			for (const token of tokens) {
				const { type } = token;

				if (type === 'inline') {
					result += render(token.children);
				} else if (!token.hidden && token.content) {
					result += `${token.content}\n`;
				}
			}

			return result;
		};

		return render(this.md.parse(str, {}));
	}
}
