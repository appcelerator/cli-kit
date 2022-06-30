import CLI from '../../../src/index.js';

new CLI({
	extensions: {
        run: `"${process.execPath}" -e`
    }
}).exec();
