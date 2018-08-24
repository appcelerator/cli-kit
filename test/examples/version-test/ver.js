const CLI = require('../../../dist/index').default;

new CLI({
	renderOpts: {
		markdown: false
	},
	version: '1.2.3'
}).exec();
