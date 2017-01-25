export default class Arguments {
	constructor(args) {
		if (args && !Array.isArray(args)) {
			throw new TypeError('Expected args to be an array');
		}

		Object.defineProperties(this, {
			args: {
				value: args || [],
				writable: true
			},
			contexts: {
				value: []
			},
			argv: {
				enumerable: true,
				value: {}
			},
			_: {
				enumerable: true,
				value: []
			}
		});
	}

	prune() {
		this.args = this.args.filter(x => x);
		return this;
	}

	toString() {
		return this.args.map(arg => arg.toString());
	}
}
