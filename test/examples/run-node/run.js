const CLI = require('../../../dist/index').default;

new CLI({
	extensions: {
        run: `${process.execPath.replace(/ /g, '\\ ')} -e`
    }
}).exec();
