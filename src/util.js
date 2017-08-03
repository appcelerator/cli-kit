/**
 * Converts the specified string to camel case where all non-word characters are removed, the words
 * are capitalized and concatenated, and the first character is lowercased.
 *
 * @param {String} str - The string to camel case.
 * @return {String}
 */
export function camelCase(str) {
	return String(str || '')
		.replace(/(?:^(?:\w+)|[A-Z]|\b\w)/g, (m, i) => {
			return i ? m.toUpperCase() : m.toLowerCase();
		})
		.replace(/[^\w]+/g, '');
}
