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
} from 'vue';
import {
	useElementBounding,
	useParentElement,
	watchThrottled,
} from '@vueuse/core';

export interface UseVirtualMasonryOptions {
	overscanPx?: MaybeRef<number | undefined>;
}

export const lowerBoundByBottom = <Meta = unknown>(
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

export const useVirtualMasonry = <Meta = unknown>(
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

	const visibleMatrix = computed(() =>
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
	let requestedRunId = 0;

	const syncVisibleItems = async (runId: number) => {
		const currentMatrix = matrix.value;
		const currentVisibleMatrix = visibleMatrix.value;
		const hasItems = currentVisibleMatrix.some((column) => column.length > 0);

		if (!currentMatrix || !hasItems) {
			if (runId === requestedRunId) {
				visibleItems.value = [];
			}

			return;
		}

		try {
			const sorted = await currentMatrix.sort(currentVisibleMatrix);

			if (runId !== requestedRunId) {
				return;
			}

			visibleItems.value = sorted;
		} catch {
			if (runId === requestedRunId) {
				visibleItems.value = [];
			}
		}
	};

	const scheduleSort = async () => {
		requestedRunId += 1;

		if (activeSort) {
			return;
		}

		activeSort = true;

		try {
			let runId = 0;

			do {
				runId = requestedRunId;

				await syncVisibleItems(requestedRunId);
			} while (runId !== requestedRunId);
		} finally {
			activeSort = false;
		}
	};

	watchThrottled(
		[matrix, visibleMatrix],
		() => {
			void scheduleSort();
		},
		{
			deep: false,
			immediate: true,
			throttle: 32,
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
