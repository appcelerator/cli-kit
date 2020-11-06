import E from '../lib/errors';
import Option from './option';

import { declareCLIKitClass } from '../lib/util';

/**
 * Stores a map of `Option` instances that have been registered for a context.
 *
 * @extends {Map}
 */
export default class OptionMap extends Map {
	/**
	 * An internal counter of options that have been added.
	 *
	 * @type {Number}
	 */
	count = 0;

	/**
	 * Declares the class name.
	 *
	 * @access public
	 */
	constructor() {
		super();
		declareCLIKitClass(this, 'OptionList');
	}

	/**
	 * Adds a option to the list.
	 *
	 * @param {String|Object|Option|OptionMap|Array<Object|Option|String>} format - An option
	 * format, an object of format to option descriptions, `Option` constructor params or `Option`
	 * instances, an `Option` instance, an `OptionMap` instance, or an array of `Option`
	 * constructor params and `Option` instances grouped by `String` labels.
	 * @param {Object|Option|String} [params] - When `format` is a format string, then this
	 * argument is either `Option` constructor parameters, an `Option` instance, or an option
	 * description.
	 * @returns {Array.<Option>}
	 * @access public
	 */
	add(format, params) {
		if (!format) {
			throw E.INVALID_ARGUMENT('Invalid option format or option', { name: 'format', scope: 'OptionMap.add', value: format });
		}

		const results = [];
		let lastGroup = '';
		let options = [];

		if (Array.isArray(format)) {
			options = format;
		} else if (typeof format === 'object' && format.clikit instanceof Set && (format.clikit.has('OptionList') || format.clikit.has('OptionMap'))) {
			for (const [ group, opts ] of format.entries()) {
				if (group && group !== lastGroup) {
					options.push(group);
					lastGroup = group;
				}
				options.push.apply(options, opts);
			}
		} else if (typeof format === 'object' && (format instanceof Option || !(format.clikit instanceof Set) || !format.clikit.has('Option'))) {
			options.push(format);
		} else {
			options.push(new Option(format, params));
		}

		// reset group
		lastGroup = '';

		const add = opt => {
			let opts = this.get(lastGroup);
			if (!opts) {
				this.set(lastGroup, opts = []);
			}
			opts.push(opt);
			results.push(opt);
			this.count++;
		};

		// at this point we have a unified array of stuff
		for (const it of options) {
			if (typeof it === 'string') {
				lastGroup = it;
				continue;
			}

			if (typeof it !== 'object') {
				throw E.INVALID_ARGUMENT(`Expected option to be an object: ${it && it.name || it}`, { name: 'option', scope: 'OptionMap.add', value: it });
			}

			if (it instanceof Option) {
				add(it);
			} else if (it.clikit instanceof Set) {
				add(new Option(it));
			} else {
				// it is a format-params object
				for (const [ format, params ] of Object.entries(it)) {
					add(params instanceof Option ? params : new Option(format, params));
				}
			}
		}

		return results;
	}

	/**
	 * Generates an object containing the options for the help screen.
	 *
	 * @returns {Object}
	 * @access public
	 */
	generateHelp() {
		let count = 0;
		const groups = {};
		const sortFn = (a, b) => {
			return a.order < b.order ? -1 : a.order > b.order ? 1 : a.long.localeCompare(b.long);
		};

		for (const [ groupName, options ] of this.entries()) {
			const group = groups[groupName] = [];
			for (const opt of options.sort(sortFn)) {
				if (!opt.hidden) {
					const label = `${opt.short ? `-${opt.short}, ` : ''}` +
						`--${opt.negate ? 'no-' : ''}${opt.long}` +
						`${opt.isFlag ? '' : ` ${opt.required ? '<' : '['}${opt.hint || 'value'}${opt.required ? '>' : ']'}`}`;

					group.push({
						aliases:  Object.keys(opt.aliases).filter(a => opt.aliases[a]),
						datatype: opt.datatype,
						default:  opt.default,
						desc:     opt.desc,
						hint:     opt.hint,
						isFlag:   opt.isFlag,
						label,
						long:     opt.long,
						max:      opt.max,
						min:      opt.min,
						name:     opt.name,
						negate:   opt.negate,
						required: opt.required,
						short:    opt.short
					});
					count++;
				}
			}
		}

		return {
			count,
			groups
		};
	}
}
