/**
 * Creates a keypress key object.
 *
 * @param {String} ch - A character sequence to generate the key from.
 * @returns {Object}
 */
export function generateKey(ch) {
	const key = {
		ctrl: false,
		meta: false,
		name: undefined,
		sequence: typeof ch === 'string' ? ch : null,
		shift: false
	};

	let escaped = typeof ch === 'string' && ch.startsWith('\x1b');
	if (escaped) {
		ch = ch.substring(1);
		if (ch.startsWith('\x1b')) {
			ch = ch.substring(1);
		}
	}

	if (escaped && (ch === 'O' || ch === '[')) {
		// unsupported
	} else if (ch === '\n') {
		key.name = 'enter';
	} else if (ch === '\r') {
		key.name = 'return';
	} else if (ch === '\b' || ch === '\x7f') {
		key.name = 'backspace';
	} else if (ch === '\x1b') {
		key.meta = escaped;
		key.name = 'escape';
	} else if (ch === ' ') {
		key.meta = escaped;
		key.name = 'space';
	} else if (!escaped && ch <= '\x1a') {
		key.ctrl = true;
		key.name = String.fromCharCode(ch.charCodeAt(0) + 'a'.charCodeAt(0) - 1);
	} else if (/^[0-9A-Za-z]$/.test(ch)) {
		key.meta = escaped;
		key.name = ch.toLowerCase();
		key.shift = /^[A-Z]$/.test(ch);
	} else if (escaped) {
		key.meta = true;
		key.name = ch.length ? undefined : 'escape';
	}

	return key;
}
