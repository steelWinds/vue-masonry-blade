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

Набор composable-хуков Vue 3 для `masonry-blade`.

[English README](./README.md)

<br>
<br>
<br>
<br>

## Быстрый старт

### Установка

Требуется `vue@^3.5.0`.

```bash
npm install vue-masonry-blade
```

```bash
pnpm add vue-masonry-blade
```

```bash
yarn add vue-masonry-blade
```

### Экспорты

```ts
import {
	useMasonry,
	useMasonryMatrix,
	useVirtualMasonry,
	getPositionedStyle,
} from 'vue-masonry-blade';
```

### Базовый пример

`useMasonry()` объединяет `useMasonryMatrix()` и
виртуализацию из `useVirtualMasonry()`.

```vue
<script setup lang="ts">
import { onMounted, ref, shallowRef } from 'vue';
import { getPositionedStyle, useMasonry } from 'vue-masonry-blade';

interface Meta {
	src: string;
}

const rootRef = ref<HTMLElement | null>(null);

const items = shallowRef([
	{ id: 1, width: 800, height: 600, meta: { src: '/images/1.jpg' } },
	{ id: 2, width: 800, height: 1100, meta: { src: '/images/2.jpg' } },
	{ id: 3, width: 800, height: 700, meta: { src: '/images/3.jpg' } },
]);

const columnCount = ref(4);
const gap = ref(12);
const overscanPx = ref(300);
const breakpoints = shallowRef({ 0: 1, 640: 2, 960: 3, 1280: 4 });

const { containerHeight, recreate, visibleItems } = useMasonry<Meta>(rootRef, {
	columnCount,
	gap,
	overscanPx,
	breakpoints,
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
				:src="item.meta?.src"
				:alt="''"
				:style="{ width: '100%', height: '100%', objectFit: 'cover' }"
			/>
		</article>
	</section>
</template>
```

> Для пагинации или бесконечной подгрузки используйте `append(items)` вместо полной пересборки исходного массива.
>
> `items` здесь намеренно хранится в `shallowRef(...)`. Если использовать
> `ref(...)` или `reactive(...)`, Vue обернет вложенные элементы в proxy, а
> такие значения нельзя передать в worker через structured clone. Это правило
> относится ко всем элементам, которые вы передаёте в `append()` /
> `recreate()` или вообще храните в исходной коллекции матрицы.

### Nuxt / SSR

`useMasonry()` и `useVirtualMasonry()` зависят от DOM-измерений, поэтому в
SSR-среде поддерево, которое использует эти хуки, должно рендериться только на
клиенте.
В Nuxt оборачивайте такую часть в `ClientOnly` или выносите использование
хуков в client-only компонент.

```vue
<ClientOnly>
	<MasonryGallery />
</ClientOnly>
```

### Composables

#### `useMasonry()`

Удобный orchestration-хук, который связывает `useMasonryMatrix()` и
`useVirtualMasonry()` в один интерфейс.

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

Создаёт и управляет экземпляром `MasonryMatrix`.
Подходит, когда нужен прямой контроль над append, recreate, sorting,
breakpoints и состоянием worker'а.

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

> Хук держит состояние матрицы синхронизированным с шириной контейнера и пересоздаёт ее при изменении ширины, `gap`, числа колонок или breakpoints.

#### `useVirtualMasonry()`

Строит видимую часть матрицы и возвращает плоский отсортированный список для
рендера.

```ts
const { visibleMatrix, visibleItems, rangeStart, rangeEnd, overscanPx } =
	useVirtualMasonry(rootRef, matrix, matrixColumns, {
		overscanPx: 300,
	});
```

- `visibleMatrix` сохраняет структуру по колонкам.
- `visibleItems` — отсортированный плоский массив видимых элементов

### Утилиты

#### `getPositionedStyle()`

Преобразует вычисленный элемент матрицы в inline-стили.

```ts
const style = getPositionedStyle(item);
```

Возвращаемая форма:

```ts
{
	width: '...px',
	height: '...px',
	transform: 'translate(...px, ...px)'
}
```

### Форма исходного элемента

Элементы, передаваемые в `recreate(items)` или `append(items)`, должны иметь
такой вид:

```ts
{
	id: string | number,
	width: number,
	height: number,
	meta?: unknown
}
```

> `width` и `height` — это исходные размеры, которые используются для расчёта финального размера элемента внутри сетки.
>
> Храните исходную коллекцию в `shallowRef(...)` или иным способом следите,
> чтобы элементы оставались plain-объектами, совместимыми со structured
> clone. В worker-режиме Vue proxy из `ref(...)` / `reactive(...)` не
> проходят structured clone и могут ломать `append()` / `recreate()`.

## Contributing

Смотрите [CONTRIBUTING.md](./CONTRIBUTING.md)

## Security

Смотрите [SECURITY.md](./SECURITY.md)

## License

Проект распространяется по лицензии MPL 2.0.

## Ссылки

- Author: [@steelWinds](https://github.com/steelWinds)
- Issues: [Open an issue](https://github.com/steelWinds/vue-masonry-blade/issues)
- Telegram: @plutograde
- Email: [Send an email](mailto:kirillsurov0@gmail.com)
