import CLI from '../../../src/index.js';

new CLI({
	extensions: {
        run: 'node -e'
    }
}).exec();
