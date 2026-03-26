import {
	type MasonryMatrix,
	type MatrixComputedUnit,
	type ReadonlyMatrix,
	type ReadonlySortItems,
} from 'masonry-blade';
import {
	type MaybeRef,
	type MaybeRefOrGetter,
	type Ref,
	computed,
	shallowRef,
	unref,
	watch,
} from 'vue';
import { useElementBounding, useParentElement } from '@vueuse/core';

export interface UseVirtualMasonryOptions {
	overscanPx?: MaybeRef<number | undefined>;
}

export const lowerBoundByBottom = <Meta = undefined>(
	items: readonly Readonly<MatrixComputedUnit<Meta>>[],
	target: number,
): number => {
	let left = 0;
	let right = items.length;

	while (left < right) {
		const mid = (left + right) >> 1;
		const item = items[mid]!;
		const bottom = item.y + item.height;

		if (bottom < target) {
			left = mid + 1;
		} else {
			right = mid;
		}
	}

	return left;
};

export const useVirtualMasonry = <Meta = undefined>(
	rootRef: MaybeRefOrGetter,
	matrix: Ref<MasonryMatrix<Meta> | null>,
	matrixColumns: Ref<ReadonlyMatrix<Meta>>,
	options: UseVirtualMasonryOptions = {},
) => {
	const el = useParentElement(rootRef);

	const { height: viewportHeight } = useElementBounding(el);

	const { top } = useElementBounding(rootRef, {
		immediate: true,
		windowResize: true,
		windowScroll: true,
	});

	const overscanPx = computed(
		() => unref(options.overscanPx) ?? Math.round(viewportHeight.value * 0.75),
	);

	const containerViewportOffset = computed(() => Math.max(0, -top.value));

	const rangeStart = computed(() =>
		Math.max(0, containerViewportOffset.value - overscanPx.value),
	);

	const rangeEnd = computed(() =>
		Math.max(
			0,
			containerViewportOffset.value + viewportHeight.value + overscanPx.value,
		),
	);

	const visibleMatrix = computed<ReadonlyMatrix<Meta>>(() =>
		matrixColumns.value.map((column) => {
			const startIndex = lowerBoundByBottom(column, rangeStart.value);
			let endIndex = startIndex;

			while (endIndex < column.length) {
				const item = column[endIndex]!;

				if (item.y > rangeEnd.value) {
					break;
				}

				endIndex += 1;
			}

			return column.slice(startIndex, endIndex);
		}),
	);

	const visibleItems = shallowRef<ReadonlySortItems<Meta>>([]);

	let activeSort = false;
	let rerunRequested = false;
	let latestRunId = 0;

	const updateVisibleItems = async (runId: number): Promise<void> => {
		const currentMatrix = matrix.value;
		const currentVisibleMatrix = visibleMatrix.value;
		const hasItems = currentVisibleMatrix.some((column) => column.length > 0);

		if (!currentMatrix || !hasItems) {
			if (runId === latestRunId) {
				visibleItems.value = [];
			}

			return;
		}

		try {
			const sorted = await currentMatrix.sort(currentVisibleMatrix);

			if (runId !== latestRunId) {
				return;
			}

			visibleItems.value = sorted;
		} catch {}
	};

	const scheduleSort = async (): Promise<void> => {
		latestRunId += 1;

		if (activeSort) {
			rerunRequested = true;
			return;
		}

		activeSort = true;

		try {
			do {
				rerunRequested = false;

				const runId = latestRunId;

				await updateVisibleItems(runId);
			} while (rerunRequested);
		} finally {
			activeSort = false;
		}
	};

	watch(
		[matrix, visibleMatrix],
		() => {
			void scheduleSort();
		},
		{
			deep: false,
			immediate: true,
		},
	);

	return {
		overscanPx,
		rangeEnd,
		rangeStart,
		visibleItems,
		visibleMatrix,
	};
};
