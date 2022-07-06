# hook-emitter

[![NPM Version][npm-image]][npm-url]
[![NPM Downloads][downloads-image]][downloads-url]
[![Travis CI Build][travis-image]][travis-url]
[![Appveyor CI Build][appveyor-image]][appveyor-url]
[![Test Coverage][coveralls-image]][coveralls-url]
[![Deps][david-image]][david-url]
[![Dev Deps][david-dev-image]][david-dev-url]

Promised-based chained event emitter with ability to create hooks around functions.

## Installation

    npm install hook-emitter

## Examples

Async listener example:

```js
import HookEmitter from 'hook-emitter';

const emitter = new HookEmitter();

emitter.on('sum', (x, y) => {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            console.log('the sum of ' + x + ' + ' + y + ' = ' + (x + y));
            resolve();
        }, 100);
    });
});

// emit and wait for all listeners to be called
await emitter.emit('sum', 3, 7);
```

Hook example:

```js
const emitter = new HookEmitter();

const hookedSum = emitter.hook('sum', (x, y) => {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            // x = 6, y = 14
            resolve(x + y);
        }, 100);
    });
});

emitter.on('sum', function (x, y) {
    console.log('doubling x and y');
    this.args[0] *= 2;
    this.args[1] *= 2;
});

emitter.on('sum', async (x, y, next) => {
	console.log('doubling result after sum function has been called');
	const r = await next();
	r.result *= 2;
	return r;
});

const result = await hookedSum(3, 7);
console.log('The sum of (6 + 14) * 2 = ' + result);
```

Chaining multiple hooked functions example:

```js
const emitter = new HookEmitter();

await emitter.hook('step1', () => {
    console.log('step 1');
})();

await emitter.hook('step2', () => {
    console.log('step 2');
})();

await emitter.hook('step3', () => {
    console.log('step 3');
})();
```

## API

### Constructor

The `HookEmitter` constructor takes no arguments.

### Properties

#### `events`

A `Map` object of event names to arrays of listener functions. This can be iterated
over using a for-of loop.

### Methods

#### `on(event, listener)`
#### `on(event, priority=0, listener)`

Adds an event listener. Returns `this`.

 * `event` String - One or more space-separated event names to add the listener to.
 * `priority` Number (optional) - Defaults to `0`. The higher the priority, the
   sooner the listener is called. Value may be negative.
 * `listener` Function - A function to call when the event is emitted.

#### `once(event, listener)`
#### `once(event, priority=0, listener)`

Adds an event listener that will only be called once. Returns `this`.

 * `event` String - One or more space-separated event names to add the listener to.
 * `priority` Number (optional) - Defaults to `0`. The higher the priority, the
   sooner the listener is called. Value may be negative.
 * `listener` Function - A function to call when the event is emitted.

#### `off(event, listener)`

Removes an event listener. Returns `this`.

 * `event` String - One or more space-separated event names to remove the listener from.
 * `listener` Function (optional) - The listener function. If not specified,
   then all listeners for the specified event are removed.

#### `emit(event, ...args)`

Emits one or more events. Returns a `Promise`.

 * `event` String - The name of the event to emit.
 * `args` * (optional) - One or more additional arguments to be emitted with the event.

#### `hook(event, ctx, fn)`

Creates a function hook. Returns a `Function` which when called returns a `Promise`.

 * `event` String - The name of the hook's event.
 * `ctx` Object (optional) - The context to run the function in. Useful if `fn` is
   going to be overwritten.
 * `fn` Function - The function being hooked up.

Hook listeners are passed the same input arguments plus a `next()` callback.
For example, if the hooked function accepts two arguments `x` and `y`, then the
listeners will be called with `x`, `y`, and `next`. A listener only needs to
call `next()` if it wishes be invoked after the hooked function has been called.

Listener functions are called in the context of the hook event meaning they can
access:

 * `this.type` String - The name of the event.
 * `this.args` Array - The same arguments that the listener is invoked with. This
   is useful if you want to modify the arguments being passed to the hooked
   function.
 * `this.fn` Function - The hooked function. You can use this to completely
   replace the hooked function.
 * `this.result` * - The result from the hooked function. If the hooked function
   is async, then this will be `undefined` and the actual result will be returned
   by the promise chain.

```js
emitter.on('foo', function (x, y, next) {
	console.log('event type:', this.type);
	console.log('args:', this.args);
	console.log('fn:', this.fn);

	// you can modify the args like this:
	this.args = [y, x];
});
```

#### `link(emitter, prefix)`

Links another `HookEmitter` to this instance. Useful if you have a class that
extends a `HookEmitter`, then another `HookEmitter` that you want to receive
the exact same events.

 * `emitter` HookEmitter - The hook emitter to link to this instance.
 * `prefix` String (optional) - An optional prefix to prepend to the event name
   being emitted from all linked emitters.

#### `unlink(emitter)`

Unlinks another `HookEmitter` from this instance. It does the opposite of
`link()`.

 * `emitter` HookEmitter - The hook emitter to unlink.

## License

MIT

[npm-image]: https://img.shields.io/npm/v/hook-emitter.svg
[npm-url]: https://npmjs.org/package/hook-emitter
[downloads-image]: https://img.shields.io/npm/dm/hook-emitter.svg
[downloads-url]: https://npmjs.org/package/hook-emitter
[travis-image]: https://travis-ci.org/cb1kenobi/hook-emitter.svg?branch=master
[travis-url]: https://travis-ci.org/cb1kenobi/hook-emitter
[appveyor-image]: https://ci.appveyor.com/api/projects/status/dt0q6xcmbydh2t4a?svg=true
[appveyor-url]: https://ci.appveyor.com/project/cb1kenobi/hook-emitter
[coveralls-image]: https://img.shields.io/coveralls/cb1kenobi/hook-emitter/master.svg
[coveralls-url]: https://coveralls.io/r/cb1kenobi/hook-emitter
[david-image]: https://img.shields.io/david/cb1kenobi/hook-emitter.svg
[david-url]: https://david-dm.org/cb1kenobi/hook-emitter
[david-dev-image]: https://img.shields.io/david/dev/cb1kenobi/hook-emitter.svg
[david-dev-url]: https://david-dm.org/cb1kenobi/hook-emitter#info=devDependencies
