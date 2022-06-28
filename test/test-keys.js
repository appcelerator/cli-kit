import { expect } from 'chai';
import { generateKey } from '../src/lib/keys.js';

describe('Keys', () => {
	it('should generate a keypress event object', () => {
		expect(generateKey()).to.deep.equal({              ctrl: false,  meta: false, name: undefined,   sequence: null,           shift: false });
		expect(generateKey(null)).to.deep.equal({          ctrl: false,  meta: false, name: undefined,   sequence: null,           shift: false });
		expect(generateKey('a')).to.deep.equal({           ctrl: false,  meta: false, name: 'a',         sequence: 'a',            shift: false });
		expect(generateKey('\x1b')).to.deep.equal({        ctrl: false,  meta: true,  name: 'escape',    sequence: '\x1b',         shift: false });
		expect(generateKey('\x1bO')).to.deep.equal({       ctrl: false,  meta: false, name: undefined,   sequence: '\x1bO',        shift: false });
		expect(generateKey('\x1b[')).to.deep.equal({       ctrl: false,  meta: false, name: undefined,   sequence: '\x1b[',        shift: false });
		expect(generateKey('\n')).to.deep.equal({          ctrl: false,  meta: false, name: 'enter',     sequence: '\n',           shift: false });
		expect(generateKey('\r')).to.deep.equal({          ctrl: false,  meta: false, name: 'return',    sequence: '\r',           shift: false });
		expect(generateKey('\b')).to.deep.equal({          ctrl: false,  meta: false, name: 'backspace', sequence: '\b',           shift: false });
		expect(generateKey('\x7f')).to.deep.equal({        ctrl: false,  meta: false, name: 'backspace', sequence: '\x7f',         shift: false });
		expect(generateKey(' ')).to.deep.equal({           ctrl: false,  meta: false, name: 'space',     sequence: ' ',            shift: false });
		expect(generateKey('\x0f')).to.deep.equal({        ctrl: true,   meta: false, name: 'o',         sequence: '\x0f',         shift: false });
		expect(generateKey('\x1b\x1b\x1b')).to.deep.equal({ ctrl: false, meta: true,  name: 'escape',    sequence: '\x1b\x1b\x1b', shift: false });
	});
});
