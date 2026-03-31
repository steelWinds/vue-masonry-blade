import {
	MasonryMatrix,
	type MatrixSourceUnit,
	type ReadonlyMatrix,
} from 'masonry-blade';
import {
	type MaybeComputedElementRef,
	createEventHook,
	tryOnBeforeUnmount,
	useElementSize,
	watchDebounced,
} from '@vueuse/core';
import { type MaybeRef, computed, shallowRef, unref } from 'vue';

export type Breakpoints = Readonly<Record<number, number>>;

export const useMasonryMatrix = <Meta = unknown>(
	rootRef: MaybeComputedElementRef,
	gap: MaybeRef<number>,
	columnCount: MaybeRef<number>,
	breakpoints?: MaybeRef<Breakpoints | undefined>,
) => {
	const matrix = shallowRef<MasonryMatrix<Meta> | null>(null);
	const matrixColumns = shallowRef<ReadonlyMatrix<Meta>>([]);
	const sourceItems = shallowRef<readonly Readonly<MatrixSourceUnit<Meta>>[]>(
		[],
	);
	const containerHeight = shallowRef(0);
	const createdHook = createEventHook<MasonryMatrix<Meta>>();

	const { width } = useElementSize(rootRef);

	let operationQueue = Promise.resolve();

	const normalizedBreakpoints = computed(() =>
		Object.entries(unref(breakpoints) ?? {})
			.map(([minWidth, columns]) => [Number(minWidth), columns] as const)
			.filter(
				([minWidth, columns]) =>
					Number.isFinite(minWidth) && Number.isInteger(columns) && columns > 0,
			)
			.sort((a, b) => a[0] - b[0]),
	);

	const resolvedColumnCount = computed(() =>
		normalizedBreakpoints.value.reduce(
			(columns, [minWidth, breakpointColumns]) =>
				width.value >= minWidth ? breakpointColumns : columns,
			unref(columnCount),
		),
	);

	const isLayoutReady = computed(
		() => width.value > 0 && resolvedColumnCount.value > 0,
	);

	const runExclusive = <T>(task: () => Promise<T>) => {
		const nextTask = operationQueue.then(task, task);

		operationQueue = nextTask.then(
			() => undefined,
			() => undefined,
		);

		return nextTask;
	};

	const ensureMatrix = () => {
		if (!isLayoutReady.value) {
			return null;
		}

		if (!matrix.value) {
			matrix.value = new MasonryMatrix<Meta>(
				width.value,
				resolvedColumnCount.value,
				unref(gap),
			);

			void createdHook.trigger(matrix.value);
		}

		return matrix.value;
	};

	const recreate = async (
		items: readonly Readonly<MatrixSourceUnit<Meta>>[] = sourceItems.value,
	) => {
		sourceItems.value = items;

		if (!isLayoutReady.value) {
			matrixColumns.value = [];

			return matrixColumns.value;
		}

		return runExclusive(async () => {
			const instance = ensureMatrix();

			if (!instance) {
				matrixColumns.value = [];

				return matrixColumns.value;
			}

			const columns = await instance.recreate({
				columnCount: resolvedColumnCount.value,
				gap: unref(gap),
				items: sourceItems.value,
				rootWidth: width.value,
			});

			containerHeight.value = Math.max(
				0,
				...(instance.getState().columnsHeights ?? [0]),
			);

			matrixColumns.value = columns;

			return columns;
		});
	};

	const append = async (items: readonly Readonly<MatrixSourceUnit<Meta>>[]) => {
		if (!items.length) {
			return matrixColumns.value;
		}

		sourceItems.value = [...sourceItems.value, ...items];

		if (!isLayoutReady.value) {
			return matrixColumns.value;
		}

		return runExclusive(async () => {
			const instance = ensureMatrix();

			if (!instance) {
				return matrixColumns.value;
			}

			const columns = await instance.append(items);

			containerHeight.value = Math.max(
				0,
				...(instance.getState().columnsHeights ?? [0]),
			);

			matrixColumns.value = columns;

			return columns;
		});
	};

	const sort = async (source: ReadonlyMatrix<Meta> = matrixColumns.value) => {
		if (!matrix.value || !source.length) {
			return [];
		}

		return runExclusive(() => matrix.value!.sort(source));
	};

	const clear = () => recreate([]);
	const terminateWorker = () => matrix.value?.terminateWorker();
	const disableWorker = () => matrix.value?.disableWorker();
	const enableWorker = () => matrix.value?.enableWorker();

	watchDebounced(
		[width, gap, columnCount, () => unref(breakpoints)],
		async () => {
			if (!isLayoutReady.value) {
				matrixColumns.value = [];

				return;
			}

			await recreate();
		},
		{
			debounce: 100,
			flush: 'post',
			immediate: true,
		},
	);

	tryOnBeforeUnmount(() => {
		terminateWorker();
	});

	return {
		append,
		clear,
		containerHeight,
		disableWorker,
		enableWorker,
		matrix,
		matrixColumns,
		onCreated: createdHook.on,
		recreate,
		resolvedColumnCount,
		sort,
		sourceItems,
		terminateWorker,
	};
};
