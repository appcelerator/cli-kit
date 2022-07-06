import CLI from '../../../src/index.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

new CLI({
	extensions: [ path.resolve(__dirname, '..', '..', 'fixtures', 'simple', 'simple.js') ]
}).exec();
