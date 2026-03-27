# vue-vue-masonry-blade

![GitHub License](https://img.shields.io/github/license/steelWinds/vue-masonry-blade)
[![Module type: ESM](https://img.shields.io/badge/module%20type-esm-brightgreen)](https://github.com/voxpelli/badges-cjs-esm)
[![build-validate](https://github.com/steelWinds/vue-masonry-blade/actions/workflows/build-validate.yml/badge.svg)](https://github.com/steelWinds/vue-masonry-blade/actions/workflows/build-validate.yml)
[![CodeQL](https://github.com/steelWinds/vue-masonry-blade/actions/workflows/github-code-scanning/codeql/badge.svg)](https://github.com/steelWinds/vue-masonry-blade/actions/workflows/codeql.yml)
![NPM Version](https://img.shields.io/npm/v/vue-masonry-blade)
![NPM Unpacked Size](https://img.shields.io/npm/unpacked-size/vue-masonry-blade)
![npm package minimized gzipped size](https://img.shields.io/bundlejs/size/vue-masonry-blade)
[![codecov](https://codecov.io/gh/steelWinds/vue-masonry-blade/graph/badge.svg?token=48NKR93X2A)](https://codecov.io/gh/steelWinds/vue-masonry-blade)

<p>
  <img align="right" width="150" height="150" src="./.github/logo.webp" alt="masonry-blade logo">
</p>

A wrapper for `vue-masonry-blade`, **featuring virtualization and reactivity.**

<br>
<br>
<br>
<br>

## Getting Started

### Installation

```bash
npm install masonry-vue-blade
```

```bash
pnpm add masonry-vue-blade
```

```bash
yarn add masonry-vue-blade
```

### Exports

```ts
import {
	DynamicMatrix,
	useMasonryMatrix,
	useVirtualMasonry,
	getPositionedStyle,
} from 'masonry-vue-blade';
```

### Quick example

`DynamicMatrix` renders visible items and exposes `append()` through the component ref.
In the current implementation, layout items are not read from props automatically.

```ts
<script setup lang="ts">
import { onMounted, useTemplateRef } from 'vue'
import { DynamicMatrix } from 'masonry-vue-blade'

const matrixRef = useTemplateRef('matrix')

const items = [
  { id: 1, width: 800, height: 600, meta: { src: '/images/1.jpg' } },
  { id: 2, width: 800, height: 1100, meta: { src: '/images/2.jpg' } },
  { id: 3, width: 800, height: 700, meta: { src: '/images/3.jpg' } },
]

onMounted(async () => {
  await matrixRef.value?.append(items)
})
</script>

<template>
  <DynamicMatrix
    ref="matrix"
    :column-count="4"
    :gap="12"
    :overscan-px="300"
    :breakpoints="{ 0: 1, 640: 2, 960: 3, 1280: 4 }"
  >
    <template #default="{ item, positionedStyle }">
      <article
        :style="{
          ...positionedStyle,
          position: 'absolute',
        }"
      >
        <img
          :src="item.meta.src"
          :alt="''"
          :style="{ width: '100%', height: '100%', objectFit: 'cover' }"
        >
      </article>
    </template>
  </DynamicMatrix>
</template>
```

### Nuxt / SSR

`DynamicMatrix` should be rendered only on the client.
In Nuxt, wrap it with `ClientOnly`.

```ts
<ClientOnly>
  <DynamicMatrix ref="matrix" :column-count="4" :gap="12">
    <template #default="{ item, positionedStyle }">
      <article :style="{ ...positionedStyle, position: 'absolute' }">
        <!-- content -->
      </article>
    </template>
  </DynamicMatrix>
</ClientOnly>
```

### Component

#### `DynamicMatrix`

A minimal render container built on top of the composables.
It creates the matrix, tracks container height, virtualizes visible items, and passes visible items into the slot.

##### Props:

- `items?: MatrixSourceUnit<Meta>[]`
- `columnCount?: number`
- `gap?: number`
- `overscanPx?: number`
- `breakpoints?: Record<number, number>`

##### Notes:

- `items` is currently not consumed by the runtime component logic.
- `items` still matters for TypeScript: it helps infer `Meta` for the component and related hook types.
- Slot content is responsible for actual rendering.
- Rendered items should usually use `position: absolute`.
- Container height is managed internally.

##### Exposed methods:

- `append(items)` — append new source items into the layout.

##### Slot props:

- `item` — computed matrix item.
- `positionedStyle` — inline position and size returned by `getPositionedStyle()`.

### Composables

#### `useMasonryMatrix()`

Creates and manages a `MasonryMatrix` instance.
Use it when you want direct control over append, recreate, sorting, breakpoints, and worker state.

```ts
const {
	matrix,
	matrixColumns,
	containerHeight,
	append,
	recreate,
	clear,
	sort,
	disableWorker,
	enableWorker,
	terminateWorker,
} = useMasonryMatrix(rootRef, gap, columnCount, breakpoints);
```

It keeps matrix state aligned with container width and recreates the layout when width, gap, column count, or breakpoints change.

#### `useVirtualMasonry()`

Builds a visible slice from matrix columns and returns a flat sorted list for rendering.
Use it when the full layout is larger than the current viewport.

```ts
const { visibleMatrix, visibleItems, rangeStart, rangeEnd, overscanPx } =
	useVirtualMasonry(rootRef, matrix, matrixColumns, {
		overscanPx: 300,
	});
```

- `visibleMatrix` keeps the per-column structure.
- `visibleItems` is the sorted flat result used by the component render loop.

### Utility

#### `getPositionedStyle()`

Converts a computed matrix item into inline styles.

```ts
const style = getPositionedStyle(item);
```

Returned shape:

```ts
{
  width: '...px',
  height: '...px',
  transform: 'translate(...px, ...px)'
}
```

### Source item shape

Items passed to `append()` should follow this shape:

```ts
{
  id: string | number,
  width: number,
  height: number,
  meta?: unknown
}
```

`width` and `height` are source dimensions used to calculate the final item size inside the grid.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md)

## Security

See [SECURITY.md](SECURITY.md)

## License

The project is distributed under the MPL 2.0 license.

## Links

- Author: [@steelWinds](https://github.com/steelWinds)
- Issues: [Open an issue](https://github.com/steelWinds/vue-masonry-blade/issues)
- Telegram: @plutograde
- Email: [Send an email](mailto:kirillsurov0@gmail.com)
