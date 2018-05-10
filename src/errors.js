const errors = {
	/**
	 * Creates an `Error` and populates the message, code, and metadata.
	 *
	 * @param {...*} args - The code, message, and metadata.
	 * @returns {Error}
	 */
	Error: function (...args) {
		return createError(global.Error, ...args);
	},

	/**
	 * Creates an `TypeError` and populates the message, code, and metadata.
	 *
	 * @param {...*} args - The code, message, and metadata.
	 * @returns {TypeError}
	 */
	TypeError: function (...args) {
		return createError(global.TypeError, ...args);
	}
};

export default errors;

/**
 * Creates an the error object and populates the message, code, and metadata.
 *
 * @param {*} type - An instantiable error object.
 * @param {String} msg - The error message.
 * @param {String} [code] - The error code.
 * @param {Object} [meta] - An object
 * @returns {*} The error object.
 */
function createError(type, msg, code, meta) {
	if (!meta && code && typeof code === 'object') {
		meta = code;
		code = undefined;
	}

	const err = new type(msg);

	if (code) {
		err.code = code;
	}

	if (meta) {
		err.meta = meta;
	}

	return err;
}
