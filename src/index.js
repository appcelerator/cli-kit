if (!Error.prepareStackTrace) {
	import 'source-map-support/register';
}

export { default, default as CLI } from './cli';
