const CLI = require('../../../dist/index').default;

new CLI({
	extensions: {
        run: `"${process.execPath}" -e`
    }
}).exec();
