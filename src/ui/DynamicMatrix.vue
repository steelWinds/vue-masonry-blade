<script setup lang="ts" generic="Meta = any">
import { computed, useTemplateRef } from 'vue';
import { useMasonryMatrix, useVirtualMasonry } from 'src/composables';
import type { DynamicMatrixProps } from './DynamicMatrix.types';
import { getPositionedStyle } from 'src/lib';

const props = withDefaults(defineProps<DynamicMatrixProps<Meta>>(), {
	columnCount: 1,
	gap: 10,
});

const rootRef = useTemplateRef('root');

const { matrix, append, matrixColumns, containerHeight } =
	useMasonryMatrix<Meta>(
		rootRef,
		computed(() => props.gap),
		computed(() => props.columnCount),
		computed(() => props.breakpoints),
	);

const { visibleItems } = useVirtualMasonry<Meta>(
	rootRef,
	matrix,
	matrixColumns,
	{ overscanPx: computed(() => props.overscanPx) },
);

const containerStyle = computed(() => ({
	height: `${containerHeight.value}px`,
}));

defineExpose({ append });
</script>

<template>
	<div class="masonry" ref="root" :style="containerStyle">
		<template v-for="item of visibleItems" :key="item.id">
			<slot :item :positioned-style="getPositionedStyle<Meta>(item)" />
		</template>
	</div>
</template>
