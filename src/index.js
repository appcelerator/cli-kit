/* istanbul ignore if */
if (!Error.prepareStackTrace) {
	require('source-map-support/register');
}

import snooplogg from 'snooplogg';

export { snooplogg };
export const { chalk, humanize, moment, pluralize, symbols } = snooplogg;

export {
	default,
	default as CLI
} from './cli';

export { default as Argument } from './argument';
export { default as Command } from './command';
export { default as Option } from './option';
export { default as Extension } from './extension';
export * from './util';
