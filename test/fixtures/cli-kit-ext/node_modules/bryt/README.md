# bryt

Get colors by brightness.

[![NPM Version][npm-image]][npm-url]
[![NPM Downloads][downloads-image]][downloads-url]
[![Travis CI Build][travis-image]][travis-url]
[![Test Coverage][coveralls-image]][coveralls-url]
[![Deps][david-image]][david-url]
[![Dev Deps][david-dev-image]][david-dev-url]

## Overview

bryt provides an API for getting all colors for a given brightness. A brightness is represented by
an integer between `0` and `255`. Some brightnesses have more colors than others.

Determining a color's brightness is a pretty simple calculation, but choosing a color by brightness
is not. bryt is essentially a giant lookup table that sorts all 16,581,375 colors. Each color is
represented by a 4-byte integer. The raw data is 66,325,500 bytes. bryt packs this data into only
3,085,594 bytes.

bryt sorts every color by brightness and stores them in compressed lookup archives. Secondly, since
colors in a specific range are similar, it stores color ranges instead of every actual color. Each
file is compressed using [brotli][brotli-url].

Yes, this is a large dependency, but it's static. The idea is this package will never change.

## Installation

    npm install bryt

## Examples

Get brightness info.

```js
const bryt = require('bryt');

const info = bryt.getBrightness(128);
console.log(`Brightness ${info.brightness} has ${info.count} colors`);

for (let i = 0; i < info.count; i++) {
	console.log(`Color ${i + 1}) ${info.getColor(i)}`);
}

console.log('All colors:', info.getColors());
```

Get a specific color by brightness and index.

```js
const color = bryt.getColor(200, 3);
```

Get all colors for a specific brightness. Note that this is not super performant.

```js
const colors = bryt.getColors(187);
for (const color of colors) {
	console.log(color);
}
```

Convert a integer color to an RGB array.

```js
const color = bryt.getColor(200, 3);
const [ red, green, blue ] = bryt.toRGB(color);
console.log(`red: ${red}, green: ${green}, blue ${blue}`);
```

## API

### `getBrightness(brightness)`

 * `brightness` (Number): A positive integer between 0 and 255.

Returns `Object` containing the `brightness`, `count` of colors, `getColor(idx)`, and `getColors()`.

### `getColor(brightness, idx)`

 * `brightness` (Number): A positive integer between 0 and 255.

Returns `Number` as a positive integer.

### `getColors(brightness)`

 * `brightness` (Number): A positive integer between 0 and 255.

Returns `Array<Number>` containing all colors (as integers).

### `toRGB(num)`

 * `num` (Number): A positive integer to split into red, green, and blue components.

Returns `Array<Number>`.

## License

MIT

[npm-image]: https://img.shields.io/npm/v/bryt.svg
[npm-url]: https://npmjs.org/package/bryt
[downloads-image]: https://img.shields.io/npm/dm/bryt.svg
[downloads-url]: https://npmjs.org/package/bryt
[travis-image]: https://img.shields.io/travis/cb1kenobi/bryt.svg
[travis-url]: https://travis-ci.org/cb1kenobi/bryt
[coveralls-image]: https://img.shields.io/coveralls/cb1kenobi/bryt/master.svg
[coveralls-url]: https://coveralls.io/r/cb1kenobi/bryt
[david-image]: https://img.shields.io/david/cb1kenobi/bryt.svg
[david-url]: https://david-dm.org/cb1kenobi/bryt
[david-dev-image]: https://img.shields.io/david/dev/cb1kenobi/bryt.svg
[david-dev-url]: https://david-dm.org/cb1kenobi/bryt#info=devDependencies
[brotli-url]: https://www.npmjs.com/package/brotli
