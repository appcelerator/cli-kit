/* istanbul ignore if */
if (!Error.prepareStackTrace) {
	require('source-map-support/register');
}

import Terminal from './terminal';
import CLI from './cli';

import Argument from './parser/argument';
import Command from './parser/command';
import Option from './parser/option';
import Extension from './parser/extension';

import * as template from './render/template';
import * as types from './parser/types';
import * as util from './lib/util';

import pluralize from 'pluralize';
import snooplogg from 'snooplogg';

export default CLI;

export const terminal = new Terminal();

export {
	Argument,
	CLI,
	Command,
	Option,
	Extension,
	pluralize,
	snooplogg,
	template,
	Terminal,
	types,
	util
};

export const { chalk } = snooplogg;
