if (!Error.prepareStackTrace) {
	require('source-map-support/register');
}

export { default, default as CLI } from './cli';
