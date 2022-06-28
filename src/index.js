import Terminal from './terminal.js';
import CLI from './cli.js';

import Argument from './parser/argument.js';
import Command from './parser/command.js';
import Option from './parser/option.js';
import Extension from './parser/extension.js';

import * as ansi from './lib/ansi.js';
import * as template from './render/template.js';
import * as types from './parser/types.js';
import * as util from './lib/util.js';

import pluralize from 'pluralize';
import snooplogg from 'snooplogg';

export default CLI;

export {
	ansi,
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
