---
title: "Architecture"
---

__cli-kit__ is comprised of several different systems:

 * Terminal
 * Parser
 * Template engine

## Terminal

In __cli-kit__, a "terminal" is an virtual terminal that manages state, control, input, and output. __cli-kit__ defines a default global terminal instance in which CLI instances use, but can be overwritten.

## Parser

The [parser](/docs/parser) is responsible for parsing command line arguments and executing actions. It is fully asynchronous allowing hooks to perform non-blocking actions.

As the parser processes the arguments, it walks a context tree looking for commands, options, flags, and arguments.

The context tree starts with a [CLI](/docs/cli) instance where subcontexts such as other CLI's, [Extensions](/docs/extensions), and [Commands](/docs/commands) are added. There is no limit to the size and depth of context trees.

## Template Engine

Most template engines are written for web applications where whitespace is not a huge concern. However, in a CLI application, whitespace is critical. You can't have control logic introducing whitespace or forcing the user to write hard to read code.

__cli-kit__'s [template engine](/docs/templates) supports embedded JavaScript logic, similar to EJS templates.
