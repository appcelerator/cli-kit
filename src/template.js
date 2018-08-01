import debug from './debug';
import E from './errors';
import fs from 'fs';

const logger = debug('cli-kit:template');
const bodyLog = logger('body').log;
const { error, log } = logger;

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
 *   `(?<=^|\n)[ \t]*(>+)`:  Find one or more contiguous `>` characters where they are at the
 *                           beginning of template or line. We capture each `>` so that we can
 *                           determine how many line returns to add after the line is printed.
 *   `([?|]*)`:              Detect zero or more modifier flags. These control rendering such as
 *                           trimming the output.
 *   `(.*?)(?:(?<!\\)\n|$)`: Capture the entire message, including multiline `\` tokens, up to the
 *                           first line break.
 *   `/gs`:                  Set the `global` and `dot all` flags. `global` will find all matches.
 *                           `dot all` (introduced in ES2018), allows us to capture intentional line
 *                           breaks.
 *
 * @type {RegExp}
 */
const printRegExp = /(?<=^|\n)[ \t]*(>+)([?|]*)(.*?)(?:(?<!\\)\n|$)/gs;

/**
 * Renders a template with the supplied data.
 *
 * @param {String} template - The template to render.
 * @param {Object} [data] - An object to inject into the template.
 * @returns {String}
 */
export function render(template, data) {
	try {
		if (!data || typeof data !== 'object') {
			data = {};
		}

		log(template);

		const vars = Object.keys(data);
		let body = (vars.length ? `let { ${vars.join(', ')} } = __data;\n\n` : '') +
			template.replace(printRegExp, (_, lines, flags, str) => {
				return `__print(\`${str.replace(/\\(?!\n)/g, '\\\\').replace(/`/g, '\\`').replace(breakRegExp, '\\n')}\`, ${lines.length - 1}, '${flags}');\n`;
			});

		bodyLog(body);

		const fn = new Function('__data', '__print', body);
		let output = '';
		fn(data, (str, linebreaks, flags) => {
			if (!flags.includes('?') || str) {
				output += `${flags.includes('|') ? str : str.trim()}${linebreaks ? '\n'.repeat(linebreaks) : ''}`;
			}
		});

		return output;
	} catch (e) {
		error(e);
		throw e;
	}
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
