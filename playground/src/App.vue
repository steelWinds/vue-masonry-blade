<script setup lang="ts">
import './playground.css';
import {
	type ComponentPublicInstance,
	computed,
	nextTick,
	onMounted,
	ref,
	useTemplateRef,
	watch,
} from 'vue';
import { DynamicMatrix } from 'src/index';
// @ts-expect-error
import LOGO_SRC from './logo.png?url';
import type { MatrixComputedUnit } from 'masonry-blade';
import { useMutationObserver } from '@vueuse/core';
import { usePicsumImages } from '../helpers/usePicsumImages';

type DemoMeta = {
	src: string;
	author?: string;
};

type DynamicMatrixPublicInstance = ComponentPublicInstance & {
	$el: HTMLElement;
	append?: (items: readonly unknown[]) => Promise<void> | void;
};

const masonryRef = useTemplateRef<DynamicMatrixPublicInstance>('masonry');

const { fetchImages, buffer } = usePicsumImages();

const MIN_COLUMNS = 1;
const MAX_COLUMNS = 12;
const INITIAL_COLUMNS = 4;

const columnCount = ref<number>(INITIAL_COLUMNS);
const isLoading = ref(false);
const renderedDomItemsSource = ref(0);

const masonryEl = computed<HTMLElement | null>(
	() => masonryRef.value?.$el ?? null,
);
const renderedDomItemsCount = computed(() => renderedDomItemsSource.value);

const syncRenderedDomItemsCount = (): void => {
	renderedDomItemsSource.value =
		masonryEl.value?.querySelectorAll('[data-masonry-card]').length ?? 0;
};

const handleColumnCountInput = (event: Event): void => {
	const target = event.target as HTMLInputElement;
	const value = Number(target.value);

	columnCount.value = Number.isFinite(value)
		? Math.min(MAX_COLUMNS, Math.max(MIN_COLUMNS, value))
		: INITIAL_COLUMNS;
};

const append = async (mode: 'replace' | 'pagination'): Promise<void> => {
	if (isLoading.value) {
		return;
	}

	isLoading.value = true;

	try {
		const images = await fetchImages(32, mode);
		await masonryRef.value?.append?.(images as readonly unknown[]);

		await nextTick();
		syncRenderedDomItemsCount();
	} finally {
		isLoading.value = false;
	}
};

const buildSrcURL = (item: MatrixComputedUnit<DemoMeta>): string =>
	`${item.meta?.src}/${Math.round(item.width)}/${Math.round(item.height)}`;

useMutationObserver(
	masonryEl,
	async () => {
		await nextTick();
		syncRenderedDomItemsCount();
	},
	{
		childList: true,
		subtree: true,
	},
);

watch(
	[masonryEl, () => buffer.value.length, columnCount],
	async () => {
		await nextTick();

		syncRenderedDomItemsCount();
	},
	{ flush: 'post' },
);

onMounted(async () => {
	await append('replace');
	await nextTick();
	syncRenderedDomItemsCount();
});
</script>

<template>
	<div class="playground-shell">
		<div class="playground-bg" />

		<div class="playground">
			<header class="hero">
				<div class="hero__content">
					<div class="hero__eyebrow">
						<a href="https://github.com/steelWinds" target="_blank">
							@steelwinds
						</a>
					</div>

					<h1 class="hero__title">vue-masonry-blade</h1>

					<p class="hero__description">
						A wrapper for
						<code style="text-decoration: underline"
							><a
								href="https://www.npmjs.com/package/masonry-blade"
								rel="noreferrer"
								target="_blank"
								>masonry-blade</a
							></code
						>, featuring virtualization and reactivity
					</p>

					<div class="hero__actions">
						<a
							class="hero__button hero__button--primary"
							href="https://www.npmjs.com/package/vue-masonry-blade"
							target="_blank"
							rel="noreferrer"
						>
							View on NPM
						</a>
						<a
							class="hero__button hero__button--primary"
							href="https://github.com/steelWinds/vue-masonry-blade"
							target="_blank"
							rel="noreferrer"
						>
							View on GitHub
						</a>
					</div>

					<div class="hero__controls">
						<label class="hero__control" for="column-count">
							<div class="hero__control-row">
								<span class="hero__control-label">Columns</span>
								<strong class="hero__control-value">{{ columnCount }}</strong>
							</div>

							<input
								id="column-count"
								class="hero__range"
								type="range"
								:min="MIN_COLUMNS"
								:max="MAX_COLUMNS"
								step="1"
								:value="columnCount"
								@input="handleColumnCountInput"
							/>

							<div class="hero__range-meta" aria-hidden="true">
								<span>{{ MIN_COLUMNS }}</span>
								<span>{{ MAX_COLUMNS }}</span>
							</div>
						</label>
					</div>

					<div class="hero__stats" aria-label="Playground stats">
						<div class="hero__stat">
							<span class="hero__stat-label">Rendered DOM</span>
							<strong class="hero__stat-value">
								{{ renderedDomItemsCount }}
							</strong>
						</div>

						<div class="hero__stat">
							<span class="hero__stat-label">Columns</span>
							<strong class="hero__stat-value">{{ columnCount }}</strong>
						</div>
					</div>
				</div>

				<div class="hero__brand">
					<div class="hero__logo-card">
						<img
							class="hero__logo"
							:src="LOGO_SRC"
							alt="vue-masonry-blade logo"
						/>
					</div>
				</div>
			</header>

			<main class="gallery-section">
				<div class="gallery-section__header">
					<div>
						<h2 class="gallery-section__title">Scroll Area</h2>
					</div>

					<button
						class="gallery-section__action"
						type="button"
						:disabled="isLoading"
						@click="append('pagination')"
					>
						{{ isLoading ? 'Loading...' : 'Load more' }}
					</button>
				</div>

				<div class="gallery-frame">
					<DynamicMatrix
						ref="masonry"
						class="masonry"
						:column-count="columnCount"
						:items="buffer"
					>
						<template #default="{ item, positionedStyle }">
							<article :style="positionedStyle" class="card" data-masonry-card>
								<div class="card__meta">
									<span class="card__badge">#{{ item.id }}</span>

									<span class="card__badge">
										{{ item.meta?.author ?? 'Unknown author' }}
									</span>
								</div>

								<img
									class="card__image"
									:src="buildSrcURL(item)"
									:alt="item.meta?.author ?? `Image ${item.id}`"
									loading="lazy"
									decoding="async"
								/>
							</article>
						</template>
					</DynamicMatrix>
				</div>
			</main>
		</div>
	</div>
</template>
