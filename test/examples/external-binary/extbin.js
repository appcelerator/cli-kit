const CLI = require('../../../dist/index').default;

new CLI({
	extensions: [ 'ping' ]
}).exec();
