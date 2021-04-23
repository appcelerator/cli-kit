import { encode } from './util';

export const bel = '\x07';

export const clear = '\x1bc';

export const cursor = {
	show:    '\x1b[?25h',
	hide:    '\x1b[?25l',
	save:    '\x1b7',
	restore: '\x1b8',
	get:     '\x1b[6n',
	home:    '\x1b[H',
	left:    '\x1b[G',

	down(n = 1)  { return n ? `\x1b[${n}B` : ''; },
	up(n = 1)    { return n ? `\x1b[${n}A` : ''; },

	backward(n = 1)  { return n ? `\x1b[${n}D` : ''; },
	forward(n = 1) { return n ? `\x1b[${n}C` : ''; },

	move(dx, dy) {
		let s = dx ? `\x1b[${dx > 0 ? `${dx}C` : `${-dx}D`}` : '';
		if (dy) {
			s += `\x1b[${dy > 0 ? `${dy}B` : `${-dy}A`}`;
		}
		return s;
	},
	to(x, y) {
		return y ? `\x1b[${y + 1};${x + 1}H` : `\x1b[${x + 1}G`;
	},

	position: /^\x1b\[(\d+);(\d+)R$/,

	next(n = 1) { return !n ? '' : (n < 0 ? '\x1b[F' : '\x1b[E').repeat(Math.abs(n)); },
	prev(n = 1) { return !n ? '' : (n > 0 ? '\x1b[F' : '\x1b[E').repeat(Math.abs(n)); }
};

export const custom = {
	echo(enabled) {
		return `\x1b]666;Echo=${enabled ? 'on' : 'off'}\x07`;
	},
	exec(command) {
		return `\x1b]666;Exec=${encode(command)}\x07`;
	},
	exit(code) {
		return `\x1b]666;Exit=${code}\x07`;
	},
	keypress(key) {
		return `\x1b]666;Keypress=${encode(key)}\x07`;
	}
};

custom.echo.re = /^\x1b\]666;Echo=(\w+)\x07$/;
custom.exec.re = /^\x1b\]666;Exec=(.+)\x07$/;
custom.exit.re = /^\x1b\]666;Exit=(\d+)\x07$/;
custom.keypress.re = /^\x1b\]666;Keypress=(.+)\x07$/;

export const erase = {
	down:    '\x1b[J',
	line:    '\x1b[2K',
	lines(count = 0) {
		let s = '';
		while (count > 0) {
			s += this.line + (--count ? cursor.up() : '');
		}
		return s ? `${s}${cursor.left}` : '';
	},
	screen:  '\x1b[2J',
	toEnd:   '\x1b[K',
	toStart: '\x1b[1K',
	up:      '\x1b[1J'
};

export const esc = '\x1b[';

export const scroll = {
	down: '\x1b[T',
	up:   '\x1b[S'
};

/**
 * Creates a hyperlink for rendering in a terminal.
 *
 * @param {String} [text] - The clickable text to display.
 * @param {String} url - The link URL.
 * @returns {String}
 */
export function link(text, url) {
	return `\x1b]8;;${url || text}\x07${text}\x1b]8;;\x07`;
}

/**
 * Splits a string into an array where even number indices are plain strings and odd number
 * indices are ANSI escape sequences.
 *
 * @param {String} str - The string to split.
 * @returns {Array.<String>}
 */
export function split(str) {
	if (typeof str !== 'string') {
		return str;
	}

	const results = [];
	const re = /\x07|\x1b(?:[a-z\d]|\[\?25[hl]|\[[A-Za-z]|\[\d+[A-Za-z]|\[\d+;\d+H|\]\d+[^\x07]+\x07)/;
	let m;

	while (m = re.exec(str)) {
		results.push(m.index ? str.substring(0, m.index) : '');
		results.push(str.substr(m.index, m[0].length));
		str = str.substring(m.index + m[0].length);
	}

	if (str) {
		results.push(str);
	}

	return results;
}

const stripRegExp = /\x1b\[(;?\d+)+m/g;

/**
 * Removes all ansi control sequences from the specified string.
 *
 * @param {String} str - The string to strip.
 * @returns {String}
 */
export function strip(str = '') {
	return String(str).replace(stripRegExp, '');
}

/**
 * Converts a string to lower case without tampering with any ANSI escape sequences.
 *
 * @param {String} str - The string to lower case.
 * @returns {String}
 */
export function toLowerCase(str) {
	return split(str).map((s, i) => i % 2 === 0 ? s.toLowerCase() : s).join('');
}

/**
 * Converts a string to upper case without tampering with any ANSI escape sequences.
 *
 * @param {String} str - The string to upper case.
 * @returns {String}
 */
export function toUpperCase(str) {
	return split(str).map((s, i) => i % 2 === 0 ? s.toUpperCase() : s).join('');
}

export function trim(str) {
	return trimStart(trimEnd(str));
}

export function trimStart(str) {
	if (str !== undefined && str !== null) {
		str = String(str).replace(/^\s*(\x07|\x1b(?:[a-z\d]|\[\?25[hl]|\[[A-Za-z]|\[\d+[A-Za-z]|\[\d+;\d+H|\]\d+[^\x07]+\x07))?\s*/, '$1');
	}
	return str;
}

export function trimEnd(str) {
	if (str !== undefined && str !== null) {
		// '\u001b[' + b + 'm'
		str = String(str).replace(/\s*(\x07|\x1b(?:[a-z\d]|\[\?25[hl]|\[[A-Za-z]|\[\d+[A-Za-z]|\[\d+;\d+H|\]\d+[^\x07]+\x07))?\s*$/, '$1');
	}
	return str;
}
