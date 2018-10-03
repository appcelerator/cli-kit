# cli-kit

[![NPM Version][npm-image]][npm-url]
[![NPM Downloads][downloads-image]][downloads-url]
[![Travis CI Build][travis-image]][travis-url]
[![Test Coverage][coveralls-image]][coveralls-url]
[![Greenkeeper badge][greenkeeper-image]][greenkeeper-url]
[![Deps][david-image]][david-url]
[![Dev Deps][david-dev-image]][david-dev-url]

Everything you need to make awesome command line applications.

## Features

* Command line parsing
* Support for command hierarchies
* Auto-generated help
* CLI template engine
* External CLI extension support

## Installation

```bash
yarn add cli-kit --save
# or
npm i cli-kit --save
```

## Usage

```js
import CLI from 'cli-kit';

(async () => {
	const { argv, _ } = await new CLI({
		options: {
			'-f, --force': 'use the force',
			'--timeout [value]': {
				desc: 'the timeout duration',
				type: 'int'
			}
		}
	}).exec();

	console.log('options:', argv);
	console.log('args:', _);
})();
```

## Architecture

In cli-kit, commands and options are grouped into "contexts". The main CLI instance defines the
"global context". Each command defines a new context. Each context can have its own commands,
options, and arguments. What you end up with is a hierarchy of contexts.

When cli-kit parses the command line arguments, it will check each argument against the global
context to see if the argument can be identified as a known command, option, or argument. If it
finds a command, it adds the command's context to a stack and re-parses any unidentified arguments.

This allows you to create deep and dynamic hierarchies of commands, options, and arguments.

## API

### class `CLI`

A `CLI` intance defines a global context for which you add commands, options, and arguments.

Extends `Context` > [`HookEmitter`](https://www.npmjs.com/package/hook-emitter).

#### `constuctor(opts)`

* `opts` : `Object` (optional)

  Various options to initialize the `CLI` instance.

##### Example

```js
const cli = new CLI({
	// An array of argument definitions. They are parsed in the order they are defined.
	args: [
		// An argument can be as simple as its name. Wrapping the name with `<` and `>` signifies
		// that the argument is required.
		'<arg1>',

		// To define an optional arguemnt, you can use `[` and `]`.
		'[arg2]',

		// Or simply omit the brackets
		'arg3',

		// For more options, you can specify an argument descriptor
		{
			// The argument name. Follows the same rules as above.
			name: 'arg4',

			// The argument's description to show in the help output.
			desc: undefined,

			// When `true`, hides the argument from usage string in the help output.
			hidden: false,

			// When `true`, captures all subsequent argument values into an array
			multiple: false,

			// Overrides the brackets and forces the argument to be required or optional.
			required: false,

			// There are several built-in types. See the "types" section below for more info.
			type: 'string'
		},

		// Adding `...` will capture all subsequent argument values into an array
		'arg4...'
	],

	// Global flag to camel case property names derived from multi-word options/arguments.
	// Defaults to true, can be overwritten by the option/argument.
	camelCase: true,

	// An object of command names to command descriptors.
	commands: {
		'some-command': {
			// The action to perform when the command is parsed.
			action({ argv, _ }) {
				console.log('options:', argv);
				console.log('args:', _);
			},

			// An array of alternate command names.
			aliases: [ 'another-command' ],

			// Command specific args. See `args` section above.
			args: [],

			// When `true`, camel case all option and argument names in the `argv` result.
			camelCase: true,

			// An object of subcommand names to subcommand descriptors.
			commands: {},

			// The command description.
			desc: undefined,

			// When `true`, hides the command from the help output.
			hidden: false,

			// An object of option formats to option descriptors. See the `options` section below.
			options: {},

			// The command name to display in the help output. Defaults to the command name.
			title: undefined
		}
	},

	// The default command `exec()` should run if no command was found during parsing.
	// If `help` is `true` and no default command is specified, it will default to displaying the
	// help screen. If you want help, but do not want to default to the help command, then set the
	// `defaultCommand` to `null`.
	defaultCommand: undefined,

	// The CLI description to print on the help screen between the usage and commands/options/args.
	desc: undefined,

	// Adds the `-h, --help` to the global flags and enables the auto-generated help screen.
	// Defaults to `true`.
	help: true,

	// The exit code to return when the help screen is displayed. This is useful if you want to
	// force the program to exit if `--help` is specified and the user is chaining commands together
	// or after displaying the help screen and prevent further execution in the CLI's promise chain.
	helpExitCode: undefined,

	// The name of the program used by the help screen to display the command's usage.
	// Defaults to "program".
	name: 'program',

	// An object of option formats to option descriptors or an array of sorted group names and
	// objects of option formats to option descriptors.
	options: {
		//
	},

	// The title for the top-level (or "Global") context. This title is displayed on the help screen
	// when displaying the list of options.
	title: 'Global',

	// When set, it will automatically wire up the `-v, --version` option. Upon calling with your
	// program with `--version`, it will display the version and exit with a success (zero) exit
	// code.
	version: null
});
```

#### `exec(args)`

Parses the command line args and executes a command, if found.

* `args` : `Array<String>` (optional)

  An array of arguments. Each argument is expected to be a string.

  Defaults to `process.argv.slice(2)`.

Returns a `Promise` that resolves an `Arguments` object. This object will contain the parsed options
in `argv` and arguments in `_`.

##### Example

```js
cli.exec()
	.then(({ argv, _ }) => {
		console.log('options:', argv);
		console.log('args:', _);
	});
```

### class `Context`

Base class for `CLI` and `Command` classes.

Extends [`HookEmitter`](https://www.npmjs.com/package/hook-emitter).

#### `argument(arg)`

Adds an argument to a `CLI` or `Command`.

* `arg` : `Argument`, `Object`, or `String`.

  An argument descriptor. Either an `Argument` instance or an `Object` to pass into a `Argument`
  constructor.

  An argument requires a `name`.

Returns a reference to the `CLI` or `Command`.

##### Example

```js
// define a non-required argument "foo"
cli.argument('foo');

// define a non-required argument "wiz"
cli.argument('[wiz]');

// define a required argument "pow"
cli.argument('<pow>');

cli.argument({
	name: 'bar',
	type: 'int'
});

cli.argument(new Argument('baz'));
```

#### `command(cmd, opts)`

Adds a command to a `CLI` or `Command`.

> TODO

#### `option(optOrFormat, group, params)`

Adds an option or group of options to a `CLI` or `Command`.

> TODO

## cli-kit vs other libraries

<table>

<thead><tr><td><h3>General</h3></td><th scope="col"><a href="https://npmjs.com/package/cli-kit">cli-kit</a></th><th scope="col"><a href="https://npmjs.com/package/caporal">Caporal.js</a></th><th scope="col"><a href="https://npmjs.com/package/commander">Commander.js</a></th><th scope="col"><a href="https://npmjs.com/package/dashdash">dashdash</a></th><th scope="col"><a href="https://npmjs.com/package/fields">fields</a></th><th scope="col"><a href="https://npmjs.com/package/inquirer">inquirer</a></th><th scope="col"><a href="https://npmjs.com/package/meow">meow</a></th><th scope="col"><a href="https://npmjs.com/package/minimist">minimist</a></th><th scope="col"><a href="https://npmjs.com/package/mri">mri</a></th><th scope="col"><a href="https://npmjs.com/package/oclif">oclif</a></th><th scope="col"><a href="https://npmjs.com/package/prompt">prompt</a></th><th scope="col"><a href="https://npmjs.com/package/promptly">promptly</a></th><th scope="col"><a href="https://npmjs.com/package/prompts">prompts</a></th><th scope="col"><a href="https://npmjs.com/package/yargs">yargs</a></th></tr></thead>

<tbody>
<tr><td>Latest version</td><td>0.3.0</td><td>0.10.0</td><td>2.18.0</td><td>1.14.1</td><td>0.1.24</td><td>6.2.0</td><td>5.0.0</td><td>1.2.0</td><td>1.1.1</td><td>1.12.1</td><td>1.0.0</td><td>3.0.3</td><td>1.1.1</td><td>12.0.2</td></tr>
<tr><td>Actively maintained <br> (within last year)</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:warning:<br>Last release Dec 2016</td><td>:warning:<br>Last release Jul 2015</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:warning:<br>Last release Sep 2015</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:warning:<br>Last release Mar 2016</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:white_check_mark:</td></tr>
<tr><td>License</td><td>MIT</td><td>MIT</td><td>MIT</td><td>MIT</td><td>MIT</td><td>MIT</td><td>MIT</td><td>MIT</td><td>MIT</td><td>MIT</td><td>MIT</td><td>MIT</td><td>MIT</td><td>MIT</td></tr>
<tr><td>Language</td><td>JavaScript</td><td>JavaScript</td><td>JavaScript</td><td>JavaScript</td><td>JavaScript</td><td>JavaScript</td><td>JavaScript</td><td>JavaScript</td><td>JavaScript</td><td>TypeScript</td><td>JavaScript</td><td>JavaScript</td><td>JavaScript</td><td>JavaScript</td></tr>
<tr><td>Async/promise support</td><td>:white_check_mark:</td><td>:white_check_mark: <sub>1</sub></td><td>:x:</td><td>:x:</td><td>:x:</td><td>:white_check_mark:</td><td>:x:</td><td>:x:</td><td>:x:</td><td>:white_check_mark: <sub>1</sub></td><td>:x:</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:x:</td></tr>
<tr><td>Data type coercion</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:x:</td><td>:x:</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:x:</td><td>:x:</td><td>:white_check_mark:</td><td>:white_check_mark:</td></tr>
<tr><td>User-defined input/output stream</td><td>:white_check_mark:</td><td>:x:</td><td>:x:</td><td>:x:</td><td>n/a</td><td>:white_check_mark:</td><td>:x:</td><td>:x:</td><td>:x:</td><td>:x:</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:warning: <sub>2</sub></td><td>:x:</td></tr>
</tbody>

<thead><tr><td><h3>Parsing</h3></td><th scope="col"><a href="https://npmjs.com/package/cli-kit">cli-kit</a></th><th scope="col"><a href="https://npmjs.com/package/caporal">Caporal.js</a></th><th scope="col"><a href="https://npmjs.com/package/commander">Commander.js</a></th><th scope="col"><a href="https://npmjs.com/package/dashdash">dashdash</a></th><th scope="col"><a href="https://npmjs.com/package/fields">fields</a></th><th scope="col"><a href="https://npmjs.com/package/inquirer">inquirer</a></th><th scope="col"><a href="https://npmjs.com/package/meow">meow</a></th><th scope="col"><a href="https://npmjs.com/package/minimist">minimist</a></th><th scope="col"><a href="https://npmjs.com/package/mri">mri</a></th><th scope="col"><a href="https://npmjs.com/package/oclif">oclif</a></th><th scope="col"><a href="https://npmjs.com/package/prompt">prompt</a></th><th scope="col"><a href="https://npmjs.com/package/promptly">promptly</a></th><th scope="col"><a href="https://npmjs.com/package/prompts">prompts</a></th><th scope="col"><a href="https://npmjs.com/package/yargs">yargs</a></th></tr></thead>

<tbody>
<tr><td>Command</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:x:</td><td>n/a</td><td>n/a</td><td>:x:</td><td>:x:</td><td>:x:</td><td>:white_check_mark:</td><td>n/a</td><td>n/a</td><td>n/a</td><td>:white_check_mark:</td></tr>
<tr><td>Command aliases</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:x:</td><td>n/a</td><td>n/a</td><td>:x:</td><td>:x:</td><td>:x:</td><td>:white_check_mark:</td><td>n/a</td><td>n/a</td><td>n/a</td><td>:white_check_mark:</td></tr>
<tr><td>Subcommands</td><td>:white_check_mark:</td><td>:warning: <sub>3</sub></td><td>:warning: <sub>4</sub></td><td>:x:</td><td>n/a</td><td>n/a</td><td>:x:</td><td>:x:</td><td>:x:</td><td>:white_check_mark:</td><td>n/a</td><td>n/a</td><td>n/a</td><td>:warning: <sub>3</sub></td></tr>
<tr><td>Options</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>n/a</td><td>n/a</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>n/a</td><td>n/a</td><td>n/a</td><td>:white_check_mark:</td></tr>
<tr><td>Options aliases</td><td>:white_check_mark:</td><td>:x:</td><td>:x:</td><td>:white_check_mark:</td><td>n/a</td><td>n/a</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:x:</td><td>n/a</td><td>n/a</td><td>n/a</td><td>:white_check_mark:</td></tr>
<tr><td>Custom option validator</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:x:</td><td>n/a</td><td>n/a</td><td>:x:</td><td>:x:</td><td>:x:</td><td>:white_check_mark:</td><td>n/a</td><td>n/a</td><td>n/a</td><td>:x: <sub>5</sub></td></tr>
<tr><td>Flags (true/false)</td><td>:white_check_mark:</td><td>:x:</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>n/a</td><td>n/a</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>n/a</td><td>n/a</td><td>n/a</td><td>:white_check_mark:</td></tr>
<tr><td>Flag negation (`--no-<name>`)</td><td>:white_check_mark:</td><td>:x:</td><td>:white_check_mark:</td><td>:x:</td><td>n/a</td><td>n/a</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>n/a</td><td>n/a</td><td>n/a</td><td>:white_check_mark:</td></tr>
<tr><td>Argument support</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>n/a</td><td>n/a</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>n/a</td><td>n/a</td><td>n/a</td><td>:white_check_mark:</td></tr>
<tr><td>Custom argument validator</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:x:</td><td>n/a</td><td>n/a</td><td>:x:</td><td>:x:</td><td>:x:</td><td>:white_check_mark:</td><td>n/a</td><td>n/a</td><td>n/a</td><td>:white_check_mark:</td></tr>
<tr><td>Stop parsing `--`</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>n/a</td><td>n/a</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>n/a</td><td>n/a</td><td>n/a</td><td>:white_check_mark:</td></tr>
<tr><td>Default option/argument values</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>n/a</td><td>n/a</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>n/a</td><td>n/a</td><td>n/a</td><td>:white_check_mark:</td></tr>
<tr><td>Environment variable support</td><td>:white_check_mark:</td><td>:x:</td><td>:x:</td><td>:white_check_mark:</td><td>n/a</td><td>n/a</td><td>:x:</td><td>:x:</td><td>:x:</td><td>:white_check_mark:</td><td>n/a</td><td>n/a</td><td>n/a</td><td>:white_check_mark: <sub>6</sub></td></tr>
<tr><td>Auto-generated help screen</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:white_check_mark: <sub>7</sub></td><td>n/a</td><td>n/a</td><td>:white_check_mark:</td><td>:x:</td><td>:x:</td><td>:white_check_mark:</td><td>n/a</td><td>n/a</td><td>n/a</td><td>:white_check_mark:</td></tr>
<tr><td>Custom help exit code</td><td>:white_check_mark:</td><td>:x:</td><td>:x:</td><td>:x:</td><td>n/a</td><td>n/a</td><td>:white_check_mark:</td><td>:x:</td><td>:x:</td><td>:x:</td><td>n/a</td><td>n/a</td><td>n/a</td><td>:x:</td></tr>
</tbody>

<thead><tr><td><h3>Prompting</h3></td><th scope="col"><a href="https://npmjs.com/package/cli-kit">cli-kit</a></th><th scope="col"><a href="https://npmjs.com/package/caporal">Caporal.js</a></th><th scope="col"><a href="https://npmjs.com/package/commander">Commander.js</a></th><th scope="col"><a href="https://npmjs.com/package/dashdash">dashdash</a></th><th scope="col"><a href="https://npmjs.com/package/fields">fields</a></th><th scope="col"><a href="https://npmjs.com/package/inquirer">inquirer</a></th><th scope="col"><a href="https://npmjs.com/package/meow">meow</a></th><th scope="col"><a href="https://npmjs.com/package/minimist">minimist</a></th><th scope="col"><a href="https://npmjs.com/package/mri">mri</a></th><th scope="col"><a href="https://npmjs.com/package/oclif">oclif</a></th><th scope="col"><a href="https://npmjs.com/package/prompt">prompt</a></th><th scope="col"><a href="https://npmjs.com/package/promptly">promptly</a></th><th scope="col"><a href="https://npmjs.com/package/prompts">prompts</a></th><th scope="col"><a href="https://npmjs.com/package/yargs">yargs</a></th></tr></thead>

<tbody>
<tr><td>Single-line text prompting</td><td>:grey_question:</td><td>n/a</td><td>n/a</td><td>n/a</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>n/a</td><td>n/a</td><td>n/a</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>n/a</td></tr>
<tr><td>Multi-line text prompting</td><td>:grey_question:</td><td>n/a</td><td>n/a</td><td>n/a</td><td>:x:</td><td>:x:</td><td>n/a</td><td>n/a</td><td>n/a</td><td>:x:</td><td>:x:</td><td>:x:</td><td>:x:</td><td>n/a</td></tr>
<tr><td>Password prompting</td><td>:grey_question:</td><td>n/a</td><td>n/a</td><td>n/a</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>n/a</td><td>n/a</td><td>n/a</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>n/a</td></tr>
<tr><td>Confirm (yes/no) prompting</td><td>:grey_question:</td><td>n/a</td><td>n/a</td><td>n/a</td><td>:white_check_mark: <sub>8</sub></td><td>:white_check_mark:</td><td>n/a</td><td>n/a</td><td>n/a</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>n/a</td></tr>
<tr><td>Press any key to continue prompting</td><td>:grey_question:</td><td>n/a</td><td>n/a</td><td>n/a</td><td>:x:</td><td>:x:</td><td>n/a</td><td>n/a</td><td>n/a</td><td>:white_check_mark:</td><td>:x:</td><td>:white_check_mark:</td><td>:x:</td><td>n/a</td></tr>
<tr><td>Inline list prompting</td><td>:grey_question:</td><td>n/a</td><td>n/a</td><td>n/a</td><td>:white_check_mark: <sub>8</sub></td><td>:white_check_mark: <sub>9</sub></td><td>n/a</td><td>n/a</td><td>n/a</td><td>:x:</td><td>:x:</td><td>:x:</td><td>:white_check_mark: <sub>10</sub></td><td>n/a</td></tr>
<tr><td>Numbered select list prompting</td><td>:grey_question:</td><td>n/a</td><td>n/a</td><td>n/a</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>n/a</td><td>n/a</td><td>n/a</td><td>:x:</td><td>:x:</td><td>:x:</td><td>:x:</td><td>n/a</td></tr>
<tr><td>Scrollable select list prompting</td><td>:grey_question:</td><td>n/a</td><td>n/a</td><td>n/a</td><td>:x:</td><td>:white_check_mark:</td><td>n/a</td><td>n/a</td><td>n/a</td><td>:x:</td><td>:x:</td><td>:x:</td><td>:white_check_mark:</td><td>n/a</td></tr>
<tr><td>Multi-select/checkbox list prompting</td><td>:grey_question:</td><td>n/a</td><td>n/a</td><td>n/a</td><td>:x:</td><td>:white_check_mark:</td><td>n/a</td><td>n/a</td><td>n/a</td><td>:x:</td><td>:x:</td><td>:x:</td><td>:white_check_mark:</td><td>n/a</td></tr>
<tr><td>File/directory prompting</td><td>:grey_question:</td><td>n/a</td><td>n/a</td><td>n/a</td><td>:white_check_mark:</td><td>:white_check_mark: <sub>11</sub></td><td>n/a</td><td>n/a</td><td>n/a</td><td>:x:</td><td>:x:</td><td>:x:</td><td>:x:</td><td>n/a</td></tr>
<tr><td>Numeric-only prompting</td><td>:grey_question:</td><td>n/a</td><td>n/a</td><td>n/a</td><td>:x:</td><td>:x:</td><td>n/a</td><td>n/a</td><td>n/a</td><td>:x:</td><td>:x:</td><td>:x:</td><td>:white_check_mark:</td><td>n/a</td></tr>
<tr><td>Date prompting</td><td>:grey_question:</td><td>n/a</td><td>n/a</td><td>n/a</td><td>:x:</td><td>:white_check_mark: <sub>12</sub></td><td>n/a</td><td>n/a</td><td>n/a</td><td>:x:</td><td>:x:</td><td>:x:</td><td>:x:</td><td>n/a</td></tr>
<tr><td>Multiple prompt chaining</td><td>:grey_question:</td><td>n/a</td><td>n/a</td><td>n/a</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>n/a</td><td>n/a</td><td>n/a</td><td>:x:</td><td>:x:</td><td>:x:</td><td>:white_check_mark:</td><td>n/a</td></tr>
<tr><td>External editor support</td><td>:grey_question:</td><td>n/a</td><td>n/a</td><td>n/a</td><td>:x:</td><td>:white_check_mark:</td><td>n/a</td><td>n/a</td><td>n/a</td><td>:x:</td><td>:x:</td><td>:x:</td><td>:x:</td><td>n/a</td></tr>
<tr><td>Custom value formatter/transformer</td><td>:grey_question:</td><td>n/a</td><td>n/a</td><td>n/a</td><td>:white_check_mark: <sub>13</sub></td><td>:white_check_mark: <sub>14</sub></td><td>n/a</td><td>n/a</td><td>n/a</td><td>:x:</td><td>:white_check_mark: <sub>15</sub></td><td>:white_check_mark: <sub>13</sub></td><td>:white_check_mark:</td><td>n/a</td></tr>
<tr><td>Custom validation</td><td>:grey_question:</td><td>n/a</td><td>n/a</td><td>n/a</td><td>:x:</td><td>:white_check_mark:</td><td>n/a</td><td>n/a</td><td>n/a</td><td>:x:</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>n/a</td></tr>
<tr><td>Default prompt values</td><td>:grey_question:</td><td>n/a</td><td>n/a</td><td>n/a</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>n/a</td><td>n/a</td><td>n/a</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>n/a</td></tr>
<tr><td>Prompt history</td><td>:grey_question:</td><td>n/a</td><td>n/a</td><td>n/a</td><td>:white_check_mark:</td><td>:white_check_mark: <sub>16</sub></td><td>n/a</td><td>n/a</td><td>n/a</td><td>:x:</td><td>:white_check_mark:</td><td>:x:</td><td>:x:</td><td>n/a</td></tr>
<tr><td>Auto-suggest mismatch</td><td>:grey_question:</td><td>n/a</td><td>n/a</td><td>n/a</td><td>:white_check_mark:</td><td>:white_check_mark: <sub>17</sub></td><td>n/a</td><td>n/a</td><td>n/a</td><td>:x:</td><td>:white_check_mark:</td><td>:x:</td><td>:x:</td><td>n/a</td></tr>
<tr><td>Autocomplete</td><td>:grey_question:</td><td>n/a</td><td>n/a</td><td>n/a</td><td>:white_check_mark:</td><td>:white_check_mark:</td><td>n/a</td><td>n/a</td><td>n/a</td><td>:x:</td><td>:x:</td><td>:x:</td><td>:white_check_mark:</td><td>n/a</td></tr>
<tr><td>Custom prompts</td><td>:grey_question:</td><td>n/a</td><td>n/a</td><td>n/a</td><td>:x:</td><td>:white_check_mark:</td><td>n/a</td><td>n/a</td><td>n/a</td><td>:x:</td><td>:x:</td><td>:x:</td><td>:x:</td><td>n/a</td></tr>
</tbody>

<thead><tr><td><h3>Logging</h3></td><th scope="col"><a href="https://npmjs.com/package/cli-kit">cli-kit</a></th><th scope="col"><a href="https://npmjs.com/package/caporal">Caporal.js</a></th><th scope="col"><a href="https://npmjs.com/package/commander">Commander.js</a></th><th scope="col"><a href="https://npmjs.com/package/dashdash">dashdash</a></th><th scope="col"><a href="https://npmjs.com/package/fields">fields</a></th><th scope="col"><a href="https://npmjs.com/package/inquirer">inquirer</a></th><th scope="col"><a href="https://npmjs.com/package/meow">meow</a></th><th scope="col"><a href="https://npmjs.com/package/minimist">minimist</a></th><th scope="col"><a href="https://npmjs.com/package/mri">mri</a></th><th scope="col"><a href="https://npmjs.com/package/oclif">oclif</a></th><th scope="col"><a href="https://npmjs.com/package/prompt">prompt</a></th><th scope="col"><a href="https://npmjs.com/package/promptly">promptly</a></th><th scope="col"><a href="https://npmjs.com/package/prompts">prompts</a></th><th scope="col"><a href="https://npmjs.com/package/yargs">yargs</a></th></tr></thead>

<tbody>
<tr><td>Application logging</td><td>:white_check_mark:</td><td>:white_check_mark: <sub>18</sub></td><td>n/a</td><td>n/a</td><td>n/a</td><td>n/a</td><td>n/a</td><td>n/a</td><td>n/a</td><td>:white_check_mark:</td><td>n/a</td><td>n/a</td><td>n/a</td><td>n/a</td></tr>
<tr><td>Application debug logging</td><td>:white_check_mark: <sub>19</sub></td><td>:x:</td><td>n/a</td><td>n/a</td><td>n/a</td><td>n/a</td><td>:white_check_mark:</td><td>n/a</td><td>:x:</td><td>:x:</td><td>n/a</td><td>n/a</td><td>n/a</td><td>n/a</td></tr>
<tr><td>Internal debug logging</td><td>:white_check_mark: <sub>19</sub></td><td>:x:</td><td>n/a</td><td>n/a</td><td>n/a</td><td>n/a</td><td>n/a</td><td>n/a</td><td>n/a</td><td>:white_check_mark: <sub>20</sub></td><td>n/a</td><td>n/a</td><td>n/a</td><td>n/a</td></tr>
</tbody>

<thead><tr><td><h3>Misc</h3></td><th scope="col"><a href="https://npmjs.com/package/cli-kit">cli-kit</a></th><th scope="col"><a href="https://npmjs.com/package/caporal">Caporal.js</a></th><th scope="col"><a href="https://npmjs.com/package/commander">Commander.js</a></th><th scope="col"><a href="https://npmjs.com/package/dashdash">dashdash</a></th><th scope="col"><a href="https://npmjs.com/package/fields">fields</a></th><th scope="col"><a href="https://npmjs.com/package/inquirer">inquirer</a></th><th scope="col"><a href="https://npmjs.com/package/meow">meow</a></th><th scope="col"><a href="https://npmjs.com/package/minimist">minimist</a></th><th scope="col"><a href="https://npmjs.com/package/mri">mri</a></th><th scope="col"><a href="https://npmjs.com/package/oclif">oclif</a></th><th scope="col"><a href="https://npmjs.com/package/prompt">prompt</a></th><th scope="col"><a href="https://npmjs.com/package/promptly">promptly</a></th><th scope="col"><a href="https://npmjs.com/package/prompts">prompts</a></th><th scope="col"><a href="https://npmjs.com/package/yargs">yargs</a></th></tr></thead>

<tbody>
<tr><td>Dedicated website</td><td>:white_check_mark:</td><td>:x:</td><td>:x:</td><td>:x:</td><td>:x:</td><td>:x:</td><td>:x:</td><td>:x:</td><td>:x:</td><td>:white_check_mark:</td><td>:x:</td><td>:x:</td><td>:x:</td><td>:white_check_mark:</td></tr>
<tr><td>External CLI extensions</td><td>:white_check_mark:</td><td>:x:</td><td>:x:</td><td>:x:</td><td>n/a</td><td>n/a</td><td>:white_check_mark:</td><td>:x:</td><td>:x:</td><td>:white_check_mark:</td><td>n/a</td><td>n/a</td><td>n/a</td><td>:x:</td></tr>
<tr><td>Internal hook system</td><td>:white_check_mark:</td><td>:x:</td><td>:x:</td><td>:x:</td><td>:x:</td><td>:x:</td><td>:x:</td><td>:x:</td><td>:x:</td><td>:white_check_mark:</td><td>:x:</td><td>:x:</td><td>:x:</td><td>:x:</td></tr>
<tr><td>Bash completion</td><td>:grey_question:</td><td>:white_check_mark:</td><td>:x:</td><td>:white_check_mark:</td><td>n/a</td><td>n/a</td><td>:x:</td><td>:x:</td><td>:x:</td><td>:x:</td><td>n/a</td><td>n/a</td><td>n/a</td><td>:x:</td></tr>
<tr><td>REPL</td><td>:grey_question:</td><td>:x:</td><td>:x:</td><td>:x:</td><td>:x:</td><td>:x:</td><td>:x:</td><td>:x:</td><td>:x:</td><td>:x:</td><td>:x:</td><td>:x:</td><td>:x:</td><td>:x:</td></tr>
<tr><td>Built-in i18n support</td><td>:grey_question:</td><td>:x:</td><td>:x:</td><td>:x:</td><td>:white_check_mark:</td><td>:x:</td><td>:x:</td><td>:x:</td><td>:x:</td><td>:x:</td><td>:x:</td><td>:x:</td><td>:x:</td><td>:x:</td></tr>
</tbody>

</table>

<sub>1. Command actions only. The actually parsing is sync.</sub><br>
<sub>2. Public API does not allow these options to actually be passed in.</sub><br>
<sub>3. Requires reparsing with subcommand context or manually subprocessing.</sub><br>
<sub>4. Automatically spawns subcommand in new process, otherwise requires reparsing with subcommand context.</sub><br>
<sub>5. Only the last parsed invalid option error is raised.</sub><br>
<sub>6. Custom environment variable names are not supported. The names must match a prefixed option name.</sub><br>
<sub>7. Options only. (e.g no usage, etc)</sub><br>
<sub>8. Via select list input type.</sub><br>
<sub>9. Via expand input type.</sub><br>
<sub>10. Maximum 2 options via toggle input type.</sub><br>
<sub>11. Via [inquirer-fuzzy-path](https://www.npmjs.com/package/inquirer-fuzzy-path) plugin.</sub><br>
<sub>12. Via [inquirer-datepicker-prompt](https://www.npmjs.com/package/inquirer-datepicker-prompt) plugin.</sub><br>
<sub>13. Via validator callback.</sub><br>
<sub>14. Via filter callback.</sub><br>
<sub>15. Via `before()` callback.</sub><br>
<sub>16. Via [inquirer-command-prompt](https://www.npmjs.com/package/inquirer-command-prompt) plugin.</sub><br>
<sub>17. Via [inquirer-prompt-suggest](https://www.npmjs.com/package/inquirer-prompt-suggest) plugin.</sub><br>
<sub>18. Via [winston](https://npmjs.com/package/winston).</sub><br>
<sub>19. Uses [snooplogg](https://npmjs.com/package/snooplogg).</sub><br>
<sub>20. Uses [debug](https://npmjs.com/package/debug).</sub><br>

> :sparkles: If you find any inaccuracies (aside from the version numbers), please feel free to submit a PR.

## Who Uses cli-kit?

 * [Axway](https://www.axway.com)

## License

MIT

[npm-image]: https://img.shields.io/npm/v/cli-kit.svg
[npm-url]: https://npmjs.org/package/cli-kit
[downloads-image]: https://img.shields.io/npm/dm/cli-kit.svg
[downloads-url]: https://npmjs.org/package/cli-kit
[travis-image]: https://img.shields.io/travis/cb1kenobi/cli-kit.svg
[travis-url]: https://travis-ci.org/cb1kenobi/cli-kit
[coveralls-image]: https://img.shields.io/coveralls/cb1kenobi/cli-kit/master.svg
[coveralls-url]: https://coveralls.io/r/cb1kenobi/cli-kit
[greenkeeper-image]: https://badges.greenkeeper.io/cb1kenobi/cli-kit.svg
[greenkeeper-url]: https://greenkeeper.io/
[david-image]: https://img.shields.io/david/cb1kenobi/cli-kit.svg
[david-url]: https://david-dm.org/cb1kenobi/cli-kit
[david-dev-image]: https://img.shields.io/david/dev/cb1kenobi/cli-kit.svg
[david-dev-url]: https://david-dm.org/cb1kenobi/cli-kit#info=devDependencies
