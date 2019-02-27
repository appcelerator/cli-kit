---
title: "FAQ"
---

### Why does the world need yet another command line parser?

The problem with many parsers is they don't support "commands". [Commands](/docs/commands) are a basic construct for separating logic into specific contexts, otherwise you end up with some delicious spaghetti code.

Of the libraries that do support commands, some of them do not support nested commands, or [subcommands](/docs/commands#subcommands). To workaround this limitation, they recommend spawning the subcommand as another command line application.

Spawning subprocesses are inefficient because the operating system needs to execute a new Node.js process, then Node.js needs to initialize itself, then all of those Node dependencies need to be reloaded, and then the command line arguments need to be parsed again.

__cli-kit__ uses a tree of commands, subcommands, and extension when parsing the command line arguments. As it asynchronous walks the tree, it preserves the parsing state and only processes the arguments it hasn't yet been able to identify.

Mix in the ability to make the dyanmic alter the tree during parsing, fire hooks, validate values, and more, __cli-kit__ is justifies its existence.

### How does __cli-kit__ relate to other "cli-kits"?

In short, it doesn't. Naming is hard. "cli-kit" was chosen because it aims to be a toolkit for CLI's and the name was available on npm.

It seems that all of the other "cli-kits" out there are either not JavaScript or not actively maintained.

### What's the history of __cli-kit__?

__cli-kit__ is engineered by [Chris Barber](https://github.com/cb1kenobi) and the product of years of frustration with the lack of quality and features found in CLI libraries back in the early Node.js days.

Back in 2012, Chris, along with other team members, worked on the [Appcelerator Titanium CLI](https://www.npmjs.com/package/titanium). It had a need for nested commands, validation, hooks, prompting, and so on. Since nothing really existed, a solution was cobbled together from optimist, winston, and a slew of other packages. The code became complex to maintain and some processing flows were hard coded. Some Titanium CLI commands required the command line arguments to be parsed 3 or 4 times.

Then in 2014, Chris set off to write a book about how to build robust command line applications with Node.js. With the royalties, he'd be forced into early retirement. Sadly, that dream was flawed from the get-go.

Anyways, with an outline in hand and a head full of experience, he came to the conclusion that there were no libraries that did what the Titanium CLI did and the Titanium CLI's parser was too tightly coupled to be re-purposed.

With a fresh start and a desire to learn ECMAScript 2015 (ES6), __cli-kit__ was born. The original code was horrible. Let's hope nobody ever sees it.
