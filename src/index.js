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

import Argument from './parser/argument';
import Command from './parser/command';
import Option from './parser/option';
import Extension from './parser/extension';

import * as template from './render/template';
import * as types from './parser/types';
import * as util from './lib/util';

export {
	Argument,
	Command,
	Option,
	Extension,
	template,
	types,
	util
};
