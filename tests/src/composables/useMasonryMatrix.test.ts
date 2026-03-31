import * as fc from 'fast-check';
import { type Breakpoints, useMasonryMatrix } from 'src/composables';
import {
	type EffectScope,
	type ShallowRef,
	computed,
	effectScope,
	nextTick,
	ref,
	shallowRef,
} from 'vue';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { FAKER_SEED } from 'tests/constants';
import { faker } from '@faker-js/faker';

type TestMeta = Readonly<{
	label: string;
	version: number;
}>;

type TestSourceItem = Readonly<{
	id: string;
	width: number;
	height: number;
	meta: TestMeta;
}>;

type TestComputedItem = TestSourceItem &
	Readonly<{
		x: number;
		y: number;
	}>;

type TestMatrix = readonly (readonly TestComputedItem[])[];

type FakeMasonryMatrixInstance = {
	rootWidth: number;
	columnCount: number;
	gap: number;
	columnsHeights: ArrayLike<number>;
	recreateResult: unknown;
	appendResult: unknown;
	sortResult: unknown;
	recreate: ReturnType<typeof vi.fn>;
	append: ReturnType<typeof vi.fn>;
	sort: ReturnType<typeof vi.fn>;
	getState: ReturnType<typeof vi.fn>;
	terminateWorker: ReturnType<typeof vi.fn>;
	disableWorker: ReturnType<typeof vi.fn>;
	enableWorker: ReturnType<typeof vi.fn>;
};

const mocks = vi.hoisted(() => {
	const instances: FakeMasonryMatrixInstance[] = [];
	const beforeUnmountCallbacks: Array<() => void> = [];

	class FakeMasonryMatrix implements FakeMasonryMatrixInstance {
		public readonly rootWidth: number;
		public readonly columnCount: number;
		public readonly gap: number;

		public columnsHeights: ArrayLike<number> = new Float64Array([0]);
		public recreateResult: unknown = [];
		public appendResult: unknown = [];
		public sortResult: unknown = [];

		public recreate = vi.fn(async () => this.recreateResult);
		public append = vi.fn(async () => this.appendResult);
		public sort = vi.fn(async () => this.sortResult);
		public getState = vi.fn(() => ({
			columnsHeights: this.columnsHeights,
		}));
		public terminateWorker = vi.fn();
		public disableWorker = vi.fn();
		public enableWorker = vi.fn();

		constructor(rootWidth: number, columnCount: number, gap: number) {
			this.rootWidth = rootWidth;
			this.columnCount = columnCount;
			this.gap = gap;

			instances.push(this);
		}
	}

	return {
		FakeMasonryMatrix,
		beforeUnmountCallbacks,
		instances,
		width: null as ShallowRef<number> | null,
	};
});

vi.mock('@vueuse/core', async () => {
	const actual =
		await vi.importActual<typeof import('@vueuse/core')>('@vueuse/core');
	const vue = await import('vue');

	if (!mocks.width) {
		mocks.width = vue.shallowRef(0);
	}

	return {
		...actual,
		tryOnBeforeUnmount: vi.fn((callback: () => void) => {
			mocks.beforeUnmountCallbacks.push(callback);
		}),
		useElementSize: vi.fn(() => ({
			height: vue.shallowRef(0),
			width: mocks.width!,
		})),
	};
});

vi.mock('masonry-blade', () => ({
	MasonryMatrix: mocks.FakeMasonryMatrix,
}));

const activeScopes: EffectScope[] = [];

const createMeta = (overrides: Partial<TestMeta> = {}): TestMeta => ({
	label: overrides.label ?? faker.word.words(2),
	version: overrides.version ?? faker.number.int({ max: 10, min: 1 }),
});

const createSourceItem = (
	overrides: Partial<TestSourceItem> = {},
): TestSourceItem => ({
	height: overrides.height ?? faker.number.int({ max: 320, min: 80 }),
	id: overrides.id ?? faker.string.uuid(),
	meta: overrides.meta ?? createMeta(),
	width: overrides.width ?? faker.number.int({ max: 320, min: 80 }),
});

const createComputedItem = (
	overrides: Partial<TestComputedItem> = {},
): TestComputedItem => {
	const source = createSourceItem(overrides);

	return {
		...source,
		x: overrides.x ?? faker.number.int({ max: 500, min: 0 }),
		y: overrides.y ?? faker.number.int({ max: 1000, min: 0 }),
	};
};

const createMatrix = (...sizes: number[]): TestMatrix =>
	sizes.map((size, columnIndex) =>
		Array.from({ length: size }, (_, itemIndex) =>
			createComputedItem({
				x: columnIndex * 100,
				y: itemIndex * 120,
			}),
		),
	);

const createDeferred = <T>() => {
	let resolve!: (value: T | PromiseLike<T>) => void;
	let reject!: (reason?: unknown) => void;

	const promise = new Promise<T>((res, rej) => {
		resolve = res;
		reject = rej;
	});

	return { promise, reject, resolve };
};

const flushDebounce = async () => {
	await nextTick();
	await vi.advanceTimersByTimeAsync(110);
	await nextTick();
};

const getLastInstance = () => {
	const instance = mocks.instances.at(-1);

	expect(instance).toBeDefined();

	return instance!;
};

const runBeforeUnmount = () => {
	for (const callback of mocks.beforeUnmountCallbacks.splice(0)) {
		callback();
	}
};

const mountHook = (options?: {
	breakpoints?: Breakpoints;
	columnCount?: number;
	gap?: number;
	width?: number;
}) => {
	const rootRef = shallowRef<HTMLElement | null>(null);
	const gap = ref(options?.gap ?? 12);
	const columnCount = ref(options?.columnCount ?? 2);
	const breakpoints = ref<Breakpoints | undefined>(options?.breakpoints);

	mocks.width!.value = options?.width ?? 0;

	const scope = effectScope();
	activeScopes.push(scope);

	let hook!: ReturnType<typeof useMasonryMatrix<TestMeta>>;

	scope.run(() => {
		hook = useMasonryMatrix<TestMeta>(
			rootRef,
			gap,
			columnCount,
			computed(() => breakpoints.value),
		);
	});

	return {
		breakpoints,
		columnCount,
		gap,
		hook,
		rootRef,
		scope,
	};
};

beforeEach(() => {
	faker.seed(FAKER_SEED);
	vi.useFakeTimers();

	mocks.width!.value = 0;
	mocks.instances.length = 0;
	mocks.beforeUnmountCallbacks.length = 0;

	vi.clearAllMocks();
});

afterEach(() => {
	for (const scope of activeScopes.splice(0)) {
		scope.stop();
	}

	vi.clearAllTimers();
	vi.useRealTimers();
});

describe('useMasonryMatrix', () => {
	describe('initialization', () => {
		test('stays idle while layout is not ready', async () => {
			const { hook } = mountHook({
				columnCount: 3,
				gap: 16,
				width: 0,
			});

			await flushDebounce();

			expect(mocks.instances).toHaveLength(0);
			expect(hook.matrix.value).toBeNull();
			expect(hook.matrixColumns.value).toStrictEqual([]);
			expect(hook.containerHeight.value).toBe(0);
		});

		test('creates matrix lazily and performs immediate recreate once layout is ready', async () => {
			const { hook } = mountHook({
				columnCount: 3,
				gap: 16,
				width: 960,
			});

			expect(hook.matrix.value).toBeNull();

			await flushDebounce();

			const instance = getLastInstance();

			expect(mocks.instances).toHaveLength(1);
			expect(hook.matrix.value).toBe(instance);

			expect(instance.rootWidth).toBe(960);
			expect(instance.columnCount).toBe(3);
			expect(instance.gap).toBe(16);

			expect(instance.recreate).toHaveBeenCalledTimes(1);
			expect(instance.recreate).toHaveBeenCalledWith({
				columnCount: 3,
				gap: 16,
				items: [],
				rootWidth: 960,
			});
		});

		test('fires onCreated when the matrix instance is created for the first time', async () => {
			const { columnCount, gap, hook } = mountHook({
				columnCount: 3,
				gap: 16,
				width: 960,
			});
			const onCreated = vi.fn();

			hook.onCreated(onCreated);

			await flushDebounce();

			const instance = getLastInstance();

			expect(onCreated).toHaveBeenCalledTimes(1);
			expect(onCreated).toHaveBeenCalledWith(instance);

			mocks.width!.value = 1200;
			columnCount.value = 4;
			gap.value = 24;

			await flushDebounce();

			expect(onCreated).toHaveBeenCalledTimes(1);
		});

		test('resolves column count from normalized breakpoints', async () => {
			const { breakpoints, columnCount, hook } = mountHook({
				columnCount: 1,
				gap: 12,
				width: 0,
			});

			await fc.assert(
				fc.asyncProperty(
					fc.integer({ max: 2400, min: 0 }),
					fc.integer({ max: 8, min: 1 }),
					fc.array(
						fc.tuple(
							fc.integer({ max: 2400, min: -300 }),
							fc.integer({ max: 10, min: -3 }),
						),
						{ maxLength: 10 },
					),
					async (currentWidth, fallbackColumns, entries) => {
						const nextBreakpoints = Object.fromEntries(
							entries.map(([minWidth, columns], index) => [
								String(minWidth + index * 0.01),
								columns,
							]),
						) as Breakpoints;

						mocks.width!.value = currentWidth;
						columnCount.value = fallbackColumns;
						breakpoints.value = nextBreakpoints;

						const expected = Object.entries(nextBreakpoints)
							.map(
								([minWidth, columns]) => [Number(minWidth), columns] as const,
							)
							.filter(
								([minWidth, columns]) =>
									Number.isFinite(minWidth) &&
									Number.isInteger(columns) &&
									columns > 0,
							)
							.sort((a, b) => a[0] - b[0])
							.reduce(
								(columns, [minWidth, breakpointColumns]) =>
									currentWidth >= minWidth ? breakpointColumns : columns,
								fallbackColumns,
							);

						expect(hook.resolvedColumnCount.value).toBe(expected);
					},
				),
				{
					numRuns: 100,
					seed: FAKER_SEED,
				},
			);
		});
	});

	describe('recreate', () => {
		test('updates sourceItems, matrixColumns and containerHeight', async () => {
			const items = [createSourceItem(), createSourceItem()];
			const recreatedColumns = createMatrix(2, 1);

			const { hook } = mountHook({
				columnCount: 2,
				gap: 20,
				width: 900,
			});

			await flushDebounce();

			const instance = getLastInstance();

			instance.recreate.mockClear();
			instance.recreate.mockResolvedValueOnce(recreatedColumns);
			instance.getState.mockReturnValue({
				columnsHeights: new Float64Array([120, 340]),
			});

			const result = await hook.recreate(items);

			expect(result).toBe(recreatedColumns);
			expect(hook.sourceItems.value).toStrictEqual(items);
			expect(hook.matrixColumns.value).toBe(recreatedColumns);
			expect(hook.containerHeight.value).toBe(340);

			expect(instance.recreate).toHaveBeenCalledTimes(1);
			expect(instance.recreate).toHaveBeenCalledWith({
				columnCount: 2,
				gap: 20,
				items,
				rootWidth: 900,
			});
		});

		test('returns empty columns when recreate is called before layout becomes ready', async () => {
			const items = [createSourceItem(), createSourceItem()];
			const { hook } = mountHook({
				columnCount: 2,
				gap: 12,
				width: 0,
			});

			const result = await hook.recreate(items);

			expect(result).toStrictEqual([]);
			expect(hook.matrixColumns.value).toStrictEqual([]);
			expect(hook.sourceItems.value).toStrictEqual(items);
			expect(mocks.instances).toHaveLength(0);
		});

		test('clear recreates matrix with empty items', async () => {
			const initialItems = [createSourceItem(), createSourceItem()];
			const { hook } = mountHook({
				columnCount: 2,
				gap: 12,
				width: 840,
			});

			await flushDebounce();

			const instance = getLastInstance();

			instance.append.mockResolvedValueOnce(createMatrix(1, 1));
			await hook.append(initialItems);

			instance.recreate.mockClear();
			instance.recreate.mockResolvedValueOnce([]);
			instance.getState.mockReturnValue({
				columnsHeights: new Float64Array([0, 0]),
			});

			const result = await hook.clear();

			expect(result).toStrictEqual([]);
			expect(hook.sourceItems.value).toStrictEqual([]);
			expect(hook.matrixColumns.value).toStrictEqual([]);
			expect(hook.containerHeight.value).toBe(0);

			expect(instance.recreate).toHaveBeenCalledTimes(1);
			expect(instance.recreate).toHaveBeenCalledWith({
				columnCount: 2,
				gap: 12,
				items: [],
				rootWidth: 840,
			});
		});
	});

	describe('append', () => {
		test('is a no-op for empty batches', async () => {
			const { hook } = mountHook({
				columnCount: 2,
				gap: 12,
				width: 720,
			});

			await flushDebounce();

			const instance = getLastInstance();

			instance.append.mockClear();

			const result = await hook.append([]);

			expect(result).toStrictEqual([]);
			expect(instance.append).not.toHaveBeenCalled();
			expect(hook.sourceItems.value).toStrictEqual([]);
		});

		test('appends items, updates columns and recalculates container height', async () => {
			const items = [
				createSourceItem(),
				createSourceItem(),
				createSourceItem(),
			];
			const appendedColumns = createMatrix(2, 1);

			const { hook } = mountHook({
				columnCount: 2,
				gap: 10,
				width: 800,
			});

			await flushDebounce();

			const instance = getLastInstance();

			instance.append.mockResolvedValueOnce(appendedColumns);
			instance.getState.mockReturnValue({
				columnsHeights: new Float64Array([180, 260]),
			});

			const result = await hook.append(items);

			expect(result).toBe(appendedColumns);
			expect(hook.sourceItems.value).toStrictEqual(items);
			expect(hook.matrixColumns.value).toBe(appendedColumns);
			expect(hook.containerHeight.value).toBe(260);

			expect(instance.append).toHaveBeenCalledTimes(1);
			expect(instance.append).toHaveBeenCalledWith(items);
		});

		test('stores items while layout is not ready and replays them on the first recreate', async () => {
			const firstBatch = [createSourceItem(), createSourceItem()];
			const secondBatch = [createSourceItem()];
			const allItems = [...firstBatch, ...secondBatch];

			const { hook } = mountHook({
				columnCount: 3,
				gap: 14,
				width: 0,
			});

			await hook.append(firstBatch);
			await hook.append(secondBatch);

			expect(hook.sourceItems.value).toStrictEqual(allItems);
			expect(mocks.instances).toHaveLength(0);

			mocks.width!.value = 1024;

			await flushDebounce();

			const instance = getLastInstance();

			expect(instance.recreate).toHaveBeenCalledWith({
				columnCount: 3,
				gap: 14,
				items: allItems,
				rootWidth: 1024,
			});
		});
	});

	describe('sort and operation queue', () => {
		test('returns empty array when sort is called without matrix or source', async () => {
			const { hook } = mountHook({
				columnCount: 2,
				gap: 12,
				width: 0,
			});

			await expect(hook.sort()).resolves.toStrictEqual([]);
			await expect(hook.sort([])).resolves.toStrictEqual([]);
		});

		test('serializes async operations via internal queue', async () => {
			const items = [createSourceItem(), createSourceItem()];
			const source = createMatrix(1, 1);
			const appendedColumns = createMatrix(2, 0);
			const sortedItems = [createComputedItem(), createComputedItem()];
			const appendDeferred = createDeferred<TestMatrix>();

			const { hook } = mountHook({
				columnCount: 2,
				gap: 12,
				width: 960,
			});

			await flushDebounce();

			const instance = getLastInstance();

			instance.append.mockImplementationOnce(() => appendDeferred.promise);
			instance.sort.mockResolvedValueOnce(sortedItems);

			const appendPromise = hook.append(items);

			await Promise.resolve();

			const sortPromise = hook.sort(source);

			await Promise.resolve();

			expect(instance.append).toHaveBeenCalledTimes(1);
			expect(instance.sort).not.toHaveBeenCalled();

			appendDeferred.resolve(appendedColumns);

			await expect(appendPromise).resolves.toBe(appendedColumns);
			await expect(sortPromise).resolves.toBe(sortedItems);

			expect(instance.sort).toHaveBeenCalledTimes(1);
			expect(instance.sort).toHaveBeenCalledWith(source);

			expect(instance.append.mock.invocationCallOrder[0]).toBeLessThan(
				instance.sort.mock.invocationCallOrder[0],
			);
		});
	});

	describe('reactive dependencies and lifecycle', () => {
		test('recreates layout when width, gap or columnCount changes', async () => {
			const { columnCount, gap } = mountHook({
				columnCount: 2,
				gap: 12,
				width: 700,
			});

			await flushDebounce();

			const instance = getLastInstance();

			instance.recreate.mockClear();

			mocks.width!.value = 840;
			gap.value = 24;
			columnCount.value = 4;

			await flushDebounce();

			expect(instance.recreate).toHaveBeenCalledTimes(1);
			expect(instance.recreate).toHaveBeenCalledWith({
				columnCount: 4,
				gap: 24,
				items: [],
				rootWidth: 840,
			});
		});

		test('recreates layout when breakpoints change the resolved column count', async () => {
			const { breakpoints, hook } = mountHook({
				breakpoints: {
					480: 2,
					900: 4,
				},
				columnCount: 1,
				gap: 16,
				width: 640,
			});

			await flushDebounce();

			const instance = getLastInstance();

			expect(hook.resolvedColumnCount.value).toBe(2);

			instance.recreate.mockClear();

			mocks.width!.value = 960;

			await flushDebounce();

			expect(hook.resolvedColumnCount.value).toBe(4);
			expect(instance.recreate).toHaveBeenCalledWith({
				columnCount: 4,
				gap: 16,
				items: [],
				rootWidth: 960,
			});

			instance.recreate.mockClear();

			breakpoints.value = {
				300: 2,
				700: 3,
			};

			await flushDebounce();

			expect(hook.resolvedColumnCount.value).toBe(3);
			expect(instance.recreate).toHaveBeenCalledWith({
				columnCount: 3,
				gap: 16,
				items: [],
				rootWidth: 960,
			});
		});

		test('delegates worker controls and terminates worker on unmount', async () => {
			const { hook } = mountHook({
				columnCount: 2,
				gap: 12,
				width: 800,
			});

			await flushDebounce();

			const instance = getLastInstance();

			hook.disableWorker();
			hook.enableWorker();
			hook.terminateWorker();

			expect(instance.disableWorker).toHaveBeenCalledTimes(1);
			expect(instance.enableWorker).toHaveBeenCalledTimes(1);
			expect(instance.terminateWorker).toHaveBeenCalledTimes(1);

			runBeforeUnmount();

			expect(instance.terminateWorker).toHaveBeenCalledTimes(2);
		});
	});
});
