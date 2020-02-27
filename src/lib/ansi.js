export const beep = '\x07';

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

	next(n = 1) { return '\x1b[E'.repeat(n); },
	prev(n = 1) { return '\x1b[F'.repeat(n); }
};

export const custom = {
	exit(code) {
		return `\x1b]1337;Exit=${code}${beep}`;
	}
};

custom.exit.re = /^\x1b\]1337;Exit=(\d+)\x07$/;

export const erase = {
	down:    '\x1b[J',
	line:    '\x1b[2K',
	lines(count) {
		let s = '';
		while (count > 0) {
			s += this.line + (--count ? cursor.up : '');
		}
		return s ? `${s}${cursor.left()}` : '';
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
	return `\x1b]8;;${url || text}${beep}${text}\x1b]8;;${beep}`;
}

const stripRegExp = /\x1b\[(;?\d+)+m/g;

/**
 * Removes all ansi control sequences from the specified string.
 *
 * @param {String} str - The string to strip.
 * @returns {String}
 */
export function strip(str) {
	return String(str).replace(stripRegExp, '');
}
