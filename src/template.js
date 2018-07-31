import E from './errors';
import fs from 'fs';

const printRegExp = /(?:^|\n)[ \t]*(>+)([?])?(.*?)(?:(?<!\\)\n|$)/s;
const exprRegExp = /\$\{([^\\}]*(?:\\.[^\\}]*)*)\}/g;

const __eval = `const __eval = it => {
	try {
		return eval(\`(\${it})\`);
	} catch (e) {
		if (e instanceof ReferenceError) {
			return '';
		}
		throw e;
	}
};`;

export function render(template, data) {
	if (!data || typeof data !== 'object') {
		data = {};
	}

	const vars = Object.keys(data);
	let injectEval = false;

	template = template.replace(printRegExp, (_, lines, modifier, str) => {
		str = str.replace(/[ \t]?\\\n/g, '\\n').replace(exprRegExp, (_, expr) => {
			injectEval = true;
			return `\${__eval('${expr}')}`;
		});
		return `__print(\`${str}\`, ${lines.length}${modifier ? `, '${modifier}'` : ''});\n`;
	});

	let body = injectEval ? `${__eval}\n\n` : '';
	if (vars.length) {
		body += `let { ${vars.join(', ')} } = __data;\n\n`;
	}
	body += template;

	// console.log(body);

	const fn = new Function('__data', '__print', body);
	let output = '';

	fn(data, (str, linebreaks, meta) => {
		if (meta !== '?' || str) {
			output += `${str}${'\n'.repeat(linebreaks)}`;
		}
	});

	return output;
}

export function renderFile(file, data) {
	let template;
	try {
		template = fs.readFileSync(file, 'utf8');
	} catch (e) {
		throw E.TEMPLATE_NOT_FOUND(`Unable to find template: ${file}`);
	}

	return render(template, data);
}
