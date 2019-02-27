---
title: "Parsing"
---

Parsing is done using a [CLI](/docs/CLI) instance and calling the [`exec()`](/docs/CLI#exec) method. Let's import the CLI class:

Next, create a `CLI` instance:

```js
const cli = new CLI();
```

Exciting! The next step is to call `exec()`, which returns a promise that resolves an object containing a list of arguments (`_`) and an object of flag-option/values (`argv`).

```js
cli.exec().then(results => {
    const { _, argv } = results;

    console.log('Args: ', _);
    console.log('Flags: ', argv);
});
```

Or you can also use async/await.

```js
const { _, argv } = await cli.exec();

console.log('Args: ', _);
console.log('Flags: ', argv);
```

Let's save it up and run it!

```sh
$ node mycli.js
Args:  []
Flags:  { color: true }

$ node mycli.js foo
Args:  [ 'foo' ]
Flags:  { color: true }

$ node mycli.js --foo
Args:  []
Flags:  { color: true, foo: true }

$ node mycli.js --foo bar
Args:  []
Flags:  { color: true, foo: 'bar' }
```

```js
import CLI from 'cli-kit';

(async () => {
    const { _, argv } = await new CLI().exec();
    console.log('Arguments:', _);
    console.log('Options:', argv);
})();
```

### Stop Parsing

`--`
