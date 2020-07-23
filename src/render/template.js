// import debug from '../lib/debug';
import E from '../lib/errors';
import fs from 'fs';

// const logger = debug('cli-kit:template:in');
// const { log } = logger;
// const log2 = logger('out').log;

/**
 * Matches intentional line breaks in multiline strings.
 *
 * @type {RegExp}
 */
const breakRegExp = /[ \t]?\\\n/g;

/**
 * Finds output statements and formats them into print statements.
 *
 * Regex breakdown:
 *   `(?<=^|\n)([ \t]*)(>+)`: Find one or more contiguous `>` characters where they are at the
 *                            beginning of template or line. We capture each `>` so that we can
 *                            determine how many line returns to add after the line is printed.
 *   `(\|\?|\?\||\||\?)?`:    Detect modifier flags. These control rendering such as trimming the
 *                            output.
 *   `(.*?)(?:(?<!\\)\n|$)`:  Capture the entire message, including multiline `\` tokens, up to the
 *                            first line break.
 *   `/gs`:                   Set the `global` and `dot all` flags. `global` will find all matches.
 *                            `dot all` (introduced in ES2018), allows us to capture intentional
 *                            line breaks.
 *
 * @type {RegExp}
 */
let printRegExp;

/**
 * Escapes tildes in a string that is to be evaluated as a template literal. It uses a simple state
 * machine to keep track of whether it's in an expression or template literal.
 *
 * @param {String} str - The string to escape.
 * @returns {String}
 */
export function escapeTildes(str) {
	let state = [ 0 ];
	let s = '';
	for (let i = 0, l = str.length; i < l; i++) {
		switch (state[0]) {
			case 0: // not in an expression
				if ((i === 0 || str[i - 1] !== '\\') && str[i] === '$' && str[i + 1] === '{') {
					s += str[i++]; // $
					s += str[i];   // {
					state.unshift(1);
				} else if (str[i] === '`') {
					s += '\\`';
				} else {
					s += str[i];
				}
				break;

			case 1: // in an expression
				if (str[i] === '}') {
					state.shift();
				} else if (str[i] === '`') {
					state.unshift(2);
				}
				s += str[i];
				break;

			case 2: // in template literal
				if (str[i] === '`') {
					state.shift();
				}
				s += str[i];
				break;
		}
	}
	return s;
}

/**
 * Renders a template with the supplied data.
 *
 * @param {String} template - The template to render.
 * @param {Object} [data] - An object to inject into the template.
 * @returns {String}
 */
export function render(template, data) {
	if (!printRegExp) {
		try {
			printRegExp = new RegExp('(?<=^|\\n)([ \\t]*)(>+)(\\|\\?|\\?\\||\\||\\?)?(.*?)(?:(?<!\\\\)\\n|$)', 'gs');
		} catch (e) {
			// istanbul ignore next
			throw E.INVALID_NODE_JS('Node.js version is too old; must be v8.10 or newer');
		}
	}

	if (!data || typeof data !== 'object') {
		data = {};
	}

	// log(template);
	// log(Object.keys(data));

	const vars = Object.keys(data);
	let body = (vars.length ? `let { ${vars.join(', ')} } = __data;\n\n` : '') +
		template.replace(printRegExp, (_, ws, lines, flags, str) => {
			str = str.replace(/\\(?!\n)/g, '\\\\');
			str = escapeTildes(str);
			str = str.replace(breakRegExp, '\\n');
			return `${ws}__print(\`${str}\`, ${lines.length - 1}${flags === undefined ? '' : `, '${flags}'`});\n`;
		});

	// log2(body);

	const fn = new Function('__data', '__print', body);
	let output = '';

	fn(data, (str, linebreaks, flags) => {
		str = flags?.includes('|') ? String(str).replace(/\s*$/g, '') : String(str).trim();
		if (!flags?.includes('?') || str) {
			output += `${str}${linebreaks ? '\n'.repeat(linebreaks) : ''}`;
		}
	});

	return output.replace(/(\r\n|\r|\n)+$/g, '\n');
}

/**
 * Reads in a template file and renders it.
 *
 * @param {String} file - The path to the template file.
 * @param {Object} [data] - An object to inject into the template.
 * @returns {String}
 */
export function renderFile(file, data) {
	let template;

	try {
		template = fs.readFileSync(file, 'utf8');
	} catch (e) {
		throw E.TEMPLATE_NOT_FOUND(`Unable to find template: ${file}`, { name: 'file', scope: 'template.renderFile', value: file });
	}

	return render(template, data);
}
