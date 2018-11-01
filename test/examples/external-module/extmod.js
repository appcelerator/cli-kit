const CLI = require('../../../dist/index').default;
const path = require('path');

new CLI({
	extensions: [ path.resolve(__dirname, '..', '..', 'fixtures', 'simple-module') ]
}).exec();
