/* istanbul ignore if */
if (!Error.prepareStackTrace) {
	require('source-map-support/register');
}

export {
	default,
	default as CLI
} from './cli';

export { Command } from './command';
export { Option } from './option';
