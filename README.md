# vue-masonry-blade

![GitHub License](https://img.shields.io/github/license/steelWinds/vue-masonry-blade)
[![Module type: ESM](https://img.shields.io/badge/module%20type-esm-brightgreen)](https://github.com/voxpelli/badges-cjs-esm)
[![build-validate](https://github.com/steelWinds/vue-masonry-blade/actions/workflows/build-validate.yml/badge.svg)](https://github.com/steelWinds/vue-masonry-blade/actions/workflows/build-validate.yml)
[![codeql](https://github.com/steelWinds/vue-masonry-blade/actions/workflows/codeql.yml/badge.svg)](https://github.com/steelWinds/vue-masonry-blade/actions/workflows/codeql.yml)
![NPM Version](https://img.shields.io/npm/v/vue-masonry-blade)
![NPM Unpacked Size](https://img.shields.io/npm/unpacked-size/vue-masonry-blade)
![npm package minimized gzipped size](https://img.shields.io/bundlejs/size/vue-masonry-blade)
[![codecov](https://codecov.io/gh/steelWinds/vue-masonry-blade/graph/badge.svg?token=48NKR93X2A)](https://codecov.io/gh/steelWinds/vue-masonry-blade)

<p>
  <img align="right" width="150" height="150" src="https://raw.githubusercontent.com/steelWinds/vue-masonry-blade/main/.github/logo.webp" alt="masonry-blade logo">
</p>

A set of Vue 3 composable hooks for `masonry-blade`.

[Russian README](./README.ru.md)

<br>
<br>
<br>
<br>

## Quick Start

### Installation

Requires `vue@^3.5.0`, `@vueuse/core@^14.2.1`, `masonry-blade@^2.0.2`.

```bash
npm install vue-masonry-blade @vueuse/core masonry-blade
```

```bash
pnpm add vue-masonry-blade @vueuse/core masonry-blade
```

```bash
yarn add vue-masonry-blade @vueuse/core masonry-blade
```

### Exports

```ts
import {
	useMasonry,
	useMasonryMatrix,
	useVirtualMasonry,
	getPositionedStyle,
} from 'vue-masonry-blade';
```

### Basic example

`useMasonry()` combines `useMasonryMatrix()` and
virtualization from `useVirtualMasonry()`.

```vue
<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { getPositionedStyle, useMasonry } from 'vue-masonry-blade';

const rootRef = ref<HTMLElement | null>(null);

const items = ref([
	{ id: 1, width: 800, height: 600, meta: { src: '/images/1.jpg' } },
	{ id: 2, width: 800, height: 1100, meta: { src: '/images/2.jpg' } },
	{ id: 3, width: 800, height: 700, meta: { src: '/images/3.jpg' } },
]);

const { containerHeight, recreate, visibleItems } = useMasonry(rootRef, {
	columnCount: 4,
	gap: 12,
	overscanPx: 300,
	breakpoints: { 0: 1, 640: 2, 960: 3, 1280: 4 },
});

onMounted(async () => {
	await recreate(items.value);
});
</script>

<template>
	<section
		ref="rootRef"
		:style="{ position: 'relative', height: `${containerHeight}px` }"
	>
		<article
			v-for="item in visibleItems"
			:key="item.id"
			:style="{
				...getPositionedStyle(item),
				position: 'absolute',
			}"
		>
			<img
				:src="item.meta.src"
				:alt="''"
				:style="{ width: '100%', height: '100%', objectFit: 'cover' }"
			/>
		</article>
	</section>
</template>
```

> For pagination or infinite loading, use `append(items)` instead of fully rebuilding the source array.

### Nuxt / SSR

`useMasonry()` and `useVirtualMasonry()` depend on DOM measurements, so in SSR
environments the subtree that uses them should be client-only.
In Nuxt, wrap that part with `ClientOnly`, or move the hook usage into a
client-only component.

```vue
<ClientOnly>
	<MasonryGallery />
</ClientOnly>
```

### Composables

#### `useMasonry()`

A convenient orchestration hook that connects `useMasonryMatrix()` and
`useVirtualMasonry()` into one interface.

```ts
const {
	matrix,
	matrixColumns,
	sourceItems,
	containerHeight,
	resolvedColumnCount,
	append,
	recreate,
	clear,
	sort,
	disableWorker,
	enableWorker,
	terminateWorker,
	visibleMatrix,
	visibleItems,
	rangeStart,
	rangeEnd,
	overscanPx,
} = useMasonry(rootRef, {
	gap,
	columnCount,
	breakpoints,
	overscanPx,
});
```

#### `useMasonryMatrix()`

Creates and manages a `MasonryMatrix` instance.
Suitable when you need direct control over append, recreate, sorting,
breakpoints, and worker state.

```ts
const {
	matrix,
	matrixColumns,
	sourceItems,
	containerHeight,
	resolvedColumnCount,
	append,
	recreate,
	clear,
	sort,
	disableWorker,
	enableWorker,
	terminateWorker,
} = useMasonryMatrix(rootRef, gap, columnCount, breakpoints);
```

> The hook keeps the matrix state synchronized with the container width and recreates the matrix when the width, `gap`, number of columns, or breakpoints change.

#### `useVirtualMasonry()`

Builds the visible part of the matrix and returns a flat sorted list for
rendering.

```ts
const { visibleMatrix, visibleItems, rangeStart, rangeEnd, overscanPx } =
	useVirtualMasonry(rootRef, matrix, matrixColumns, {
		overscanPx: 300,
	});
```

- `visibleMatrix` preserves the column structure.
- `visibleItems` is a sorted flat array of visible elements

### Utilities

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

Items passed to `recreate(items)` or `append(items)` must have
this shape:

```ts
{
	id: string | number,
	width: number,
	height: number,
	meta?: unknown
}
```

> `width` and `height` are the original dimensions used to calculate the final item size inside the grid.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md)

## Security

See [SECURITY.md](./SECURITY.md)

## License

The project is distributed under the MPL 2.0 license.

## Links

- Author: [@steelWinds](https://github.com/steelWinds)
- Issues: [Open an issue](https://github.com/steelWinds/vue-masonry-blade/issues)
- Telegram: @plutograde
- Email: [Send an email](mailto:kirillsurov0@gmail.com)
