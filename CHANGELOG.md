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
