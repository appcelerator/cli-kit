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
