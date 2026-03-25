<script setup lang="ts">
import {
	type Breakpoints,
	useMasonryMatrix,
} from '../composables/useMasonryMatrix';
import { computed, useTemplateRef } from 'vue';
import { getPositionedStyle } from '../lib/getPositionedStyle';
import { useVirtualMasonry } from '../composables/useVirtualMasonry';

interface Props {
	columnCount?: number;
	gap?: number;
	breakpoints?: Breakpoints;
}

const props = withDefaults(defineProps<Props>(), {
	columnCount: 1,
	gap: 10,
});

const rootRef = useTemplateRef('root');

const { matrix, append, matrixColumns, containerHeight } =
	useMasonryMatrix<any>(
		rootRef,
		computed(() => props.gap),
		computed(() => props.columnCount),
		computed(() => props.breakpoints),
	);

const { visibleItems } = useVirtualMasonry<any>(rootRef, matrix, matrixColumns);

const containerStyle = computed(() => ({
	height: `${containerHeight.value}px`,
}));

defineExpose({ append });
</script>

<template>
	<div class="masonry" ref="root" :style="containerStyle">
		<template v-for="item of visibleItems" :key="item.id">
			<slot :item :positioned-style="getPositionedStyle(item)" />
		</template>
	</div>
</template>
