import CLI from '../../../src/index.js';
import { nodePath } from '../../../src/lib/util.js';

new CLI({
	extensions: [ nodePath() ]
}).exec();
