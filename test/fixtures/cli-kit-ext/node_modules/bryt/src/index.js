const decompress = require('brotli/decompress');
const fs = require('fs');
const path = require('path');

const lookupDir = path.resolve(__dirname, '..', 'lookup');
const index = JSON.parse(fs.readFileSync(path.join(lookupDir, 'index.json')));

module.exports.getBrightness = getBrightness;
module.exports.getColor      = getColor;
module.exports.getColors     = getColors;
module.exports.toRGB         = toRGB;

/**
 * Checks that the brightness value is valid.
 *
 * @param {Number} brightness - The brightness level.
 */
function assertBrightness(brightness) {
	if (typeof brightness !== 'number' || ~~brightness !== brightness) {
		throw new TypeError('Expected brightness to be an integer');
	}

	if (brightness < 0 || brightness > 255) {
		throw new RangeError('Expected brightness to be between 0 and 255');
	}
}

/**
 * Loads the brightness archive.
 *
 * @param {Number} brightness - The brightness level.
 * @returns {Object}
 */
function load(brightness) {
	const buffer = Buffer.from(decompress(fs.readFileSync(path.join(lookupDir, `${brightness}.br`))));
	return {
		buffer,
		numColors: buffer.length === 0 ? 0 : buffer.readUInt32LE(0),
		offset: 4
	};
}

/**
 * Gets information about a specific brightness and scoped functions for retreiving that brightness'
 * colors or a specific color by index.
 *
 * @param {Number} brightness - The brightness level.
 * @returns {Object}
 */
function getBrightness(brightness) {
	assertBrightness(brightness);

	return {
		brightness,
		count: index[brightness],
		getColor(idx) {
			return getColor(brightness, idx);
		},
		getColors() {
			return getColors(brightness);
		}
	};
}

/**
 * Returns a color at the specified index for the given brightness.
 *
 * @param {Number} brightness - The brightness level.
 * @param {Number} idx - The index in the list of colors.
 * @returns {Number}
 */
function getColor(brightness, idx) {
	assertBrightness(brightness);

	if (typeof idx !== 'number' || ~~idx !== idx) {
		throw new TypeError('Expected index to be an integer');
	}

	if (idx < 0) {
		throw new RangeError('Expected index to be a positive integer');
	}

	let { buffer, numColors, offset } = load(brightness);
	let total = 0;

	while (offset < buffer.length && total < numColors) {
		const count = buffer.readUInt32LE(offset);
		offset += 4;

		let num = buffer.readUInt32LE(offset);
		offset += 4;

		// console.log(`count=${count} num=${num} offset=${offset}`);

		if (idx >= total && idx <= (total + count)) {
			return num + idx - total;
		}

		total += count;
	}

	/* istanbul ignore next */
	return 0;
}

/**
 * Returns all colors for the specified brightness.
 *
 * @param {Number} brightness - The brightness level.
 * @returns {Array.<Number>}
 */
function getColors(brightness) {
	assertBrightness(brightness);

	let { buffer, numColors, offset } = load(brightness);
	const colors = [];
	const len = buffer.length;

	while (offset < len && colors.length < numColors) {
		let count = buffer.readUInt32LE(offset);
		offset += 4;

		let num = buffer.readUInt32LE(offset);
		offset += 4;

		// console.log(`count=${count} num=${num} offset=${offset} length=${len}`);

		for (let i = 0; i < count; i++) {
			colors.push(num + i);
		}
	}

	return colors;
}

/**
 * Converts a number to an array of red, green, and blue component values.
 *
 * @param {Number} num - A number representing a color.
 * @returns {Array.<Number>}
 */
function toRGB(num) {
	if (typeof num !== 'number' || ~~num !== num) {
		throw new TypeError('Expected color to be an integer');
	}

	if (num < 0) {
		throw new RangeError('Expected color to be a positive integer');
	}

	return [ (num >> 16) & 0xFF, (num >> 8) & 0xFF, num & 0xFF ];
}
