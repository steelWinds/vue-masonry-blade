<script setup lang="ts">
import { onMounted, useTemplateRef } from 'vue';
import { DynamicMatrix } from '../../src';
import type { MatrixComputedUnit } from 'masonry-blade';
import { usePicsumImages } from '../helpers/usePicsumImages';

const masonryRef = useTemplateRef('masonry');

const { fetchImages } = usePicsumImages();

const append = async (mode: 'replace' | 'pagination') => {
	const images = await fetchImages(32, mode);

	await masonryRef.value?.append(images as any);
};

const buildSrcURL = (item: MatrixComputedUnit<any>) =>
	`${item.meta.src}/${Math.round(item.width)}/${Math.round(item.height)}`;

onMounted(() => append('replace'));
</script>

<template>
	<div class="container">
		<DynamicMatrix
			ref="masonry"
			class="masonry"
			:breakpoints="{
				320: 2,
				540: 4,
				840: 6,
			}"
		>
			<template v-slot="{ item, positionedStyle }">
				<div :style="positionedStyle" class="container__item">
					<div class="container__item-wrapper">
						<div class="container__meta">
							<span class="container__meta-item"> ID: {{ item.id }} </span>

							<span class="container__meta-item">
								{{ item.meta.author }}
							</span>
						</div>
					</div>

					<img class="container__img" :src="buildSrcURL(item)" alt="" />
				</div>
			</template>
		</DynamicMatrix>

		<button class="container__btn" @click="append('pagination')">
			Load More
		</button>
	</div>
</template>

<style>
.masonry {
	position: relative;
	width: 100%;
}

.container {
	width: 100%;
	height: 100vh;
	margin: 0 auto;
	overflow: hidden auto;
	padding: 10px;
	scrollbar-gutter: stable;
}

.container__btn {
	display: block;
	margin: 20px auto;
	width: 240px;
	background-color: beige;
	border: 0;
	padding: 20px;
	cursor: pointer;
}

.container__item {
	position: absolute;
	inset: 0;
	border-radius: 12px;
	overflow: hidden;
	transition: all 0.3s ease;
	background-color: oklch(51.585% 0.01072 258.432);
}

.container__item-wrapper {
	position: relative;
}

.container__meta {
	position: absolute;
	top: 6px;
	left: 6px;
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	gap: 4px;
	z-index: 2;
}

.container__meta-item {
	background-color: white;
	padding: 2px 10px;
	border-radius: calc(infinity * 1px);
	font-size: 14px;
}

.container__img {
	width: calc(100% + 2px);
	height: calc(100% + 2px);
	margin: -1px 0 0 -1px;
	object-fit: cover;
	z-index: 1;
}
</style>
