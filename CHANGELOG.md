# 1.8.1 (Aug 26, 2020)

 * fix(parser): Fixed bug where if the context tree changed, the last argument would never be
   re-parsed.

# 1.8.0 (Aug 25, 2020)

 * feat(parser): Added `finalize` event hook that is emitted before applying defaults and filling
   `argv` and `_`.
 * feat(parser): Added `data` and `parser` to `parse` event payload and all argument and option
   callbacks.
 * feat(parser): Fire argument and option callbacks for every argument and option across all
   contexts even if they're not discovered. This allows programs to dynamically resolve default
   values or alter the context tree.
 * feat(command): Added `callback` parameter that is fired as soon as the parser finds the command.
 * refactor(parser): `Parser` now extends a `HookEmitter` and is linked to the `CLI` instance to
   decouple the `CLI` from the `Parser`.
 * refactor(parser): Moved default value initialization and populating `argv` and `_` to end of
   parser chain so that option callbacks have the ability to modify the contexts and continue
   parsing.
 * fix(keys): Fixed `generateKey()` to support multiple sequential escape sequences.
 * chore: Updated dependencies.
 * test(keys): Added unit tests for `generateKey()`.

# 1.7.0 (Aug 13, 2020)

 * feat(ansi): Added `ansi.split()` to break a string up by ANSI escape sequences.
 * feat(ansi): Added `ansi.toLowerCase()` and `ansi.toUpperCase()`.
 * chore: Updated dependencies.

# 1.6.2 (Aug 11, 2020)

 * fix(cli): Only show help on errors caused by parsing and validation, not command execution.

# 1.6.1 (Aug 5, 2020)

 * fix(cli): Fixed regression introduced in v1.6.0 that broke missing argument validation.
 * fix(argument): Added missing argument `callback` and `hint`.
 * chore: Updated dev dependencies.

# 1.6.0 (Aug 3, 2020)

 * feat(help): Added `CLI` instanced styles to help template rendering.
 * fix(terminal): Only wire up keypress on stdin when added to `Terminal` and not if some other
   logic listens on stdin.
 * fix(parser): Moved missing required argument validation from parser to CLI to allow option
   callbacks such as `--version` to work properly.
 * chore: Updated dependencies.

# 1.5.2 (Jul 24, 2020)

 * fix(terminal): Fixed bug where `keypress` event listeners were not properly being wired up to
   `stdin` resulting in the listener not being removed after being fired once.

# 1.5.1 (Jul 23, 2020)

 * fix(context): Fixed circular reference introduced when fixing the `generateHelp` hook event in
   v1.3.0 when generated JSON object is stringified.

# 1.5.0 (Jul 23, 2020)

 * feat(cli): Added `showHelp` flag on thrown errors to override `showHelpOnError`. Defaults to
   `true`. This still requires `help` to be enabled.
 * feat(debug): Added `error` style for help template and server mode error handling.
 * fix(cli): Removed duplicate error logging when server mode execution throws exception.
 * fix(help): Allow non-Error objects to be thrown and rendered on the help screen.
 * chore(dep): Replaced `fast-levenshtein` with `fastest-levenshtein`.

# 1.4.0 (Jul 21, 2020)

 * feat(cli): Added support for user-defined in `styles` passed into the `CLI` constructor as well
   as the `exec()` method.
 * feat(template): Added `subheading` style.
 * fix(template): Properly escape tildes in templates with nested expressions.
 * fix(help): Fixed option heading and subheading styling where the trailing `:` wasn't styled and
   whitespace was being trimmed.
 * fix(help): Fixed option format to use proper required indicators.
 * fix(cli): Fixed rendering of errors to debug log when server connection executes a command that
   throws an exception.

# 1.3.0 (Jul 21, 2020)

 * feat(cli): Added `exec` hook event.
 * feat(context): Added `ctx` property to `generateHelp` hook event.
 * fix(parser): Fixed bug in server mode where `parse` hook event was being omitted from the cloned
   context which is not accessible instead of the originating `CLI` instance.
 * fix(cli): Fixed issue with server mode execution where a context would be deeply cloned, however
   `Command` and `Extension` objects were passed by reference.
 * chore: Updated dependencies.

# 1.2.4 (Jun 24, 2020)

 * fix(cli): Server-side output streams extend TTY `WriteStream` to improve compatibility with
   packages that check `isTTY` and terminal helper functions such as `cursorTo()` and
   `clearLine()`.
 * chore: Updated dev dependencies.

# 1.2.3 (Jun 19, 2020)

 * feat(cli): Added `timeout` option to `CLI.connect()` with default of 5 seconds.
 * fix(cli): `CLI.connect()` now waits for terminal resize handshake to complete before resolving.
 * fix(cli): Set the remote terminal size on the stdout/stderr streams.

# 1.2.2 (Jun 17, 2020)

 * fix(cli): Fixed issue where extension banner was not overriding parent context's banner.
 * fix(terminal): Fixed issue where banner was not being displayed if output occurred before banner
   callback was registered.

# 1.2.1 (Jun 15, 2020)

 * fix: Force all options after an extension is found to be an argument.
 * fix: Sort commands and extensions alphabetically in the help output.
 * chore: Updated dependencies.

# 1.2.0 (Jun 3, 2020)

 * feat(commands): Added syntactic sugar for declaring commands with aliases and arguments.
 * feat(help): Added command aliases to the help screen.
 * fix(cli): Dynamically resolve 'showHelpOnError'.
 * fix(parser): Correctly resolve the parsed argument name in the debug logging.
 * style(cli): Capitalized `--version` description.
 * chore: Updated dev dependencies.

# 1.1.1 (May 26, 2020)

 * fix(cli): On error, print the error stack instead of the error object to prevent infinite
   loops when JSON stringifying error objects during error the printing.
 * fix(cli): Improved server eval exit code handling.
 * fix(help): Highlight format for missing options.
 * chore: Updated dev dependencies.

# 1.1.0 (May 15, 2020)

 * feat(cli): Added new `keypress` ansi sequence for improved raw input handling in server mode.
 * feat(cli): Added new `exec` ansi sequence to explicitly run a command and differentiate between
   running a command and stdin input.
 * refactor(cli): Greating improved remote stdin handling in server mode enabling support for
   prompting.
 * fix(cli): Fixed bug where client wasn't emitting the correct exit code.
 * fix(context): Added `CLI` properties to context init so that help in server mode can render
   properly.
 * fix(parser): Fixed bug where known options that are not flags and do not have values were not
   properly being defaulted to an empty string.
 * fix(help): Trim the rendered help output to avoid excess whitespace.
 * chore: Updated dependencies.

# 1.0.1 (May 8, 2020)

 * fix(cli): Added support for 'parentContextNames' when a remote CLI instance is unaware of the
   local CLI's parent hierarchy.
 * fix(cli): Fixed bug where remote banner would not suppress local banner and end up rendering
   both.
 * fix(cli): Added banner to CLI schema object.
 * chore: Updated dependencies.

# 1.0.0 (May 1, 2020)

 * BREAKING CHANGE: Require Node.js 10 or newer.
 * fix(cli): Fixed bug where `--version` callback would show version if `next()` returned a truthy
   value instead of `true` since this option is a flag.
 * fix(parser): Fixed regression introduced in 24f5048 where parser context chains where processed
   one context at a time instead of chaining them all together.
 * fix(cli): Run the default command if selected command does not have an action. Fixes
   [#64](https://github.com/cb1kenobi/cli-kit/issues/64).
 * chore: Updated dependencies.