---
title: "Getting Started"
---

## Prerequisites

__cli-kit__ requires Node.js 8.10.0 or newer.

## Installation

Begin by adding __cli-kit__ to your project:

```sh
npm i cli-kit --save
```

or

```sh
yarn add cli-kit --save
```

## Parsing Example

First thing you need to do is import the `CLI` class. You can use either the modern ES6 modules syntax or the older ES5 syntax.

```js
// ES6
import CLI from 'cli-kit';

// ES5
const { CLI } = require('cli-kit');
```

Next, create your `CLI` instance:

```js
const cli = new CLI();
```

Finally, call the `.exec()` method. By default it will parse `process.argv.slice(2)`.

```js
cli.exec()
    .then(results => {
        console.log('Arguments:', results._);
        console.log('Options:', results.argv);
    });
```

## Next Steps

 * [Parsing command line arguments](/docs/parsing)
 * [CLI configuration](/docs/cli)
 * [Creating commands and subcommands](/docs/commands)
 * [Defining flags and options](/docs/options)
 * [Defining arguments](/docs/arguments)
