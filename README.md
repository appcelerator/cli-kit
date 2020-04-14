# cli-kit

A command line application toolkit for Node.js.

[![NPM Version][npm-image]][npm-url]
[![NPM Downloads][downloads-image]][downloads-url]
[![Travis CI Build][travis-image]][travis-url]
[![Appveyor CI Build][appveyor-image]][appveyor-url]
[![Test Coverage][coveralls-image]][coveralls-url]
[![Greenkeeper badge][greenkeeper-image]][greenkeeper-url]
[![Deps][david-image]][david-url]
[![Dev Deps][david-dev-image]][david-dev-url]

## Features

* Command line parsing
* Support for dynamic command hierarchies
* Auto-generated help
* CLI template engine
* External CLI extensions
* Client and server for remote CLI session such as [xterm.js][xterm]
* Automatic Node.js version enforcement

## Installation

	npm install cli-kit --save

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

## Pseudo-Terminal Support

cli-kit extensions can be native binary executables or other Node.js scripts. When the extension is
a native executable, then it is executed using Node's `spawn()`. However, Node's `spawn()` does not
expose a TTY to the child process and thus things like prompting may not work or xterm.js support.

To solve this, the executable needs to be run in a pseudo terminal. Add the
[`node-pty-prebuilt-multiarch`][node-pty] dependency to your project and cli-kit will use it to
spawn the native executable.

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

## Who Uses cli-kit?

 * [Axway](https://www.axway.com)

## License

MIT

[npm-image]: https://img.shields.io/npm/v/cli-kit.svg
[npm-url]: https://npmjs.org/package/cli-kit
[downloads-image]: https://img.shields.io/npm/dm/cli-kit.svg
[downloads-url]: https://npmjs.org/package/cli-kit
[travis-image]: https://travis-ci.org/cb1kenobi/cli-kit.svg?branch=master
[travis-url]: https://travis-ci.org/cb1kenobi/cli-kit
[appveyor-image]: https://ci.appveyor.com/api/projects/status/nhbqpsx6jc10xnjw?svg=true
[appveyor-url]: https://ci.appveyor.com/project/cb1kenobi/cli-kit
[coveralls-image]: https://img.shields.io/coveralls/cb1kenobi/cli-kit/master.svg
[coveralls-url]: https://coveralls.io/r/cb1kenobi/cli-kit
[greenkeeper-image]: https://badges.greenkeeper.io/cb1kenobi/cli-kit.svg
[greenkeeper-url]: https://greenkeeper.io/
[david-image]: https://img.shields.io/david/cb1kenobi/cli-kit.svg
[david-url]: https://david-dm.org/cb1kenobi/cli-kit
[david-dev-image]: https://img.shields.io/david/dev/cb1kenobi/cli-kit.svg
[david-dev-url]: https://david-dm.org/cb1kenobi/cli-kit#info=devDependencies
[xterm]: https://xtermjs.org/
[node-pty]: https://www.npmjs.com/package/node-pty-prebuilt-multiarch
