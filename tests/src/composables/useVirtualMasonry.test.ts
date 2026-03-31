import * as fc from 'fast-check';
import {
	type EffectScope,
	type ShallowRef,
	computed,
	effectScope,
	nextTick,
	ref,
	shallowRef,
} from 'vue';
import type {
	MasonryMatrix,
	MatrixComputedUnit,
	ReadonlyMatrix,
	ReadonlySortItems,
} from 'masonry-blade';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { lowerBoundByBottom, useVirtualMasonry } from 'src/composables';
import { FAKER_SEED } from 'tests/constants';
import { faker } from '@faker-js/faker';

type TestMeta = Readonly<{
	label: string;
	order: number;
}>;

type TestItem = Readonly<MatrixComputedUnit<TestMeta>>;

type TestMatrix = ReadonlyMatrix<TestMeta>;
type TestVisibleItems = ReadonlySortItems<TestMeta>;

type TestMatrixFacade = Pick<MasonryMatrix<TestMeta>, 'sort'>;

const vueuseState = vi.hoisted(() => ({
	parentElement: null as ShallowRef<Element | null> | null,
	rootTop: null as ShallowRef<number> | null,
	viewportHeight: null as ShallowRef<number> | null,
}));

vi.mock('@vueuse/core', async () => {
	const vue = await import('vue');

	if (!vueuseState.parentElement) {
		vueuseState.parentElement = vue.shallowRef<Element | null>(null);
	}

	if (!vueuseState.rootTop) {
		vueuseState.rootTop = vue.shallowRef(0);
	}

	if (!vueuseState.viewportHeight) {
		vueuseState.viewportHeight = vue.shallowRef(0);
	}

	return {
		useElementBounding: vi.fn((_target: unknown, options?: object) => {
			if (options) {
				return {
					top: vueuseState.rootTop!,
				};
			}

			return {
				height: vueuseState.viewportHeight!,
			};
		}),
		useParentElement: vi.fn(() => vueuseState.parentElement!),
	};
});

const activeScopes: EffectScope[] = [];

const createMeta = (overrides: Partial<TestMeta> = {}): TestMeta => ({
	label: overrides.label ?? faker.word.words(2),
	order: overrides.order ?? faker.number.int({ max: 100, min: 1 }),
});

const createItem = (overrides: Partial<TestItem> = {}): TestItem => ({
	height: overrides.height ?? faker.number.int({ max: 240, min: 40 }),
	id: overrides.id ?? faker.string.uuid(),
	meta: overrides.meta ?? createMeta(),
	width: overrides.width ?? faker.number.int({ max: 240, min: 40 }),
	x: overrides.x ?? 0,
	y: overrides.y ?? 0,
});

const createDeferred = <T>() => {
	let resolve!: (value: T | PromiseLike<T>) => void;
	let reject!: (reason?: unknown) => void;

	const promise = new Promise<T>((res, rej) => {
		resolve = res;
		reject = rej;
	});

	return {
		promise,
		reject,
		resolve,
	};
};

const flush = async (cycles = 4) => {
	for (let index = 0; index < cycles; index += 1) {
		await Promise.resolve();
		await nextTick();
	}
};

const createMatrixFacade = (): TestMatrixFacade => ({
	sort: vi.fn(async () => []),
});

const mountHook = (options?: {
	matrix?: TestMatrixFacade | null;
	matrixColumns?: TestMatrix;
	overscanPx?: number | undefined;
	rootTop?: number;
	viewportHeight?: number;
}) => {
	const rootRef = shallowRef<HTMLElement | null>(null);
	const matrix = ref<TestMatrixFacade | null>(options?.matrix ?? null);
	const matrixColumns = ref<TestMatrix>(options?.matrixColumns ?? []);
	const overscanPx = ref<number | undefined>(options?.overscanPx);

	vueuseState.rootTop!.value = options?.rootTop ?? 0;
	vueuseState.viewportHeight!.value = options?.viewportHeight ?? 0;

	const scope = effectScope();
	activeScopes.push(scope);

	let hook!: ReturnType<typeof useVirtualMasonry<TestMeta>>;

	scope.run(() => {
		hook = useVirtualMasonry<TestMeta>(
			computed(() => rootRef.value),
			matrix as never,
			matrixColumns as never,
			{
				overscanPx,
			},
		);
	});

	return {
		hook,
		matrix,
		matrixColumns,
		overscanPx,
		rootRef,
		scope,
	};
};

beforeEach(() => {
	faker.seed(FAKER_SEED);

	vueuseState.parentElement!.value = null;
	vueuseState.rootTop!.value = 0;
	vueuseState.viewportHeight!.value = 0;

	vi.clearAllMocks();
});

afterEach(() => {
	for (const scope of activeScopes.splice(0)) {
		scope.stop();
	}
});

describe('lowerBoundByBottom', () => {
	test('returns 0 for an empty array', () => {
		expect(lowerBoundByBottom([], 100)).toBe(0);
	});

	test('returns the first index whose item bottom is greater than or equal to target', () => {
		const items = [
			createItem({ height: 100, y: 0 }),
			createItem({ height: 80, y: 120 }),
			createItem({ height: 60, y: 240 }),
			createItem({ height: 120, y: 320 }),
		];

		expect(lowerBoundByBottom(items, -1)).toBe(0);
		expect(lowerBoundByBottom(items, 0)).toBe(0);
		expect(lowerBoundByBottom(items, 100)).toBe(0);
		expect(lowerBoundByBottom(items, 101)).toBe(1);
		expect(lowerBoundByBottom(items, 200)).toBe(1);
		expect(lowerBoundByBottom(items, 201)).toBe(2);
		expect(lowerBoundByBottom(items, 440)).toBe(3);
		expect(lowerBoundByBottom(items, 441)).toBe(4);
	});

	test('matches linear search for arbitrary sorted columns', () => {
		fc.assert(
			fc.property(
				fc.array(
					fc.record({
						gap: fc.integer({ max: 40, min: 0 }),
						height: fc.integer({ max: 200, min: 1 }),
					}),
					{ maxLength: 40 },
				),
				fc.integer({ max: 10_000, min: -100 }),
				(segments, target) => {
					let currentY = 0;

					const items = segments.map(({ gap, height }, index) => {
						const item = createItem({
							height,
							id: `item-${index}`,
							y: currentY,
						});

						currentY += height + gap;

						return item;
					});

					const expected = items.findIndex(
						(item) => item.y + item.height >= target,
					);

					expect(lowerBoundByBottom(items, target)).toBe(
						expected === -1 ? items.length : expected,
					);
				},
			),
			{
				numRuns: 200,
				seed: FAKER_SEED,
			},
		);
	});
});

describe('useVirtualMasonry', () => {
	test('computes default overscan from viewport height', async () => {
		const { hook } = mountHook({
			matrix: null,
			matrixColumns: [],
			rootTop: -80,
			viewportHeight: 201,
		});

		await flush();

		expect(hook.overscanPx.value).toBe(151);
		expect(hook.rangeStart.value).toBe(0);
		expect(hook.rangeEnd.value).toBe(432);
	});

	test('uses explicit overscan when provided', async () => {
		const { hook } = mountHook({
			matrix: null,
			matrixColumns: [],
			overscanPx: 50,
			rootTop: -80,
			viewportHeight: 200,
		});

		await flush();

		expect(hook.overscanPx.value).toBe(50);
		expect(hook.rangeStart.value).toBe(30);
		expect(hook.rangeEnd.value).toBe(330);
	});

	test('builds visibleMatrix by slicing each column inside the visible range', async () => {
		const b = createItem({ height: 100, id: 'b', y: 120 });
		const c = createItem({ height: 100, id: 'c', y: 240 });
		const g = createItem({ height: 40, id: 'g', y: 200 });

		const matrixColumns: TestMatrix = [
			[
				createItem({ height: 100, id: 'a', y: 0 }),
				b,
				c,
				createItem({ height: 100, id: 'd', y: 360 }),
			],
			[
				createItem({ height: 50, id: 'e', y: 0 }),
				createItem({ height: 80, id: 'f', y: 60 }),
				g,
				createItem({ height: 40, id: 'h', y: 280 }),
			],
		];

		const { hook } = mountHook({
			matrix: null,
			matrixColumns,
			overscanPx: 0,
			rootTop: -150,
			viewportHeight: 100,
		});

		await flush();

		expect(hook.rangeStart.value).toBe(150);
		expect(hook.rangeEnd.value).toBe(250);
		expect(hook.visibleMatrix.value).toStrictEqual([[b, c], [g]]);
		expect(hook.visibleItems.value).toStrictEqual([]);
	});

	test('sorts visibleMatrix and exposes visibleItems', async () => {
		const sorted: TestVisibleItems = [
			createItem({ id: 'sorted-1', x: 0, y: 120 }),
			createItem({ id: 'sorted-2', x: 100, y: 200 }),
		];
		const matrix = createMatrixFacade();
		const matrixColumns: TestMatrix = [
			[
				createItem({ height: 80, id: 'a', y: 0 }),
				createItem({ height: 100, id: 'b', y: 120 }),
			],
			[createItem({ height: 100, id: 'c', y: 200 })],
		];

		vi.mocked(matrix.sort).mockResolvedValueOnce(sorted);

		const { hook } = mountHook({
			matrix,
			matrixColumns,
			overscanPx: 0,
			rootTop: -100,
			viewportHeight: 160,
		});

		await flush();

		expect(matrix.sort).toHaveBeenCalledTimes(1);
		expect(matrix.sort).toHaveBeenCalledWith(hook.visibleMatrix.value);
		expect(hook.visibleItems.value).toStrictEqual(sorted);
	});

	test('resets visibleItems to an empty array when there is no matrix', async () => {
		const { hook } = mountHook({
			matrix: null,
			matrixColumns: [[createItem({ height: 100, y: 0 })]],
			overscanPx: 0,
			rootTop: 0,
			viewportHeight: 300,
		});

		await flush();

		expect(hook.visibleItems.value).toStrictEqual([]);
	});

	test('resets visibleItems to an empty array when nothing is visible', async () => {
		const matrix = createMatrixFacade();

		vi.mocked(matrix.sort).mockResolvedValueOnce([
			createItem({ height: 100, id: 'visible', y: 0 }),
		]);

		const { hook, matrixColumns } = mountHook({
			matrix,
			matrixColumns: [[createItem({ height: 100, y: 0 })]],
			overscanPx: 0,
			rootTop: 0,
			viewportHeight: 300,
		});

		await flush();

		expect(hook.visibleItems.value).toHaveLength(1);

		matrixColumns.value = [[]];

		await flush();

		expect(hook.visibleItems.value).toStrictEqual([]);
	});

	test('ignores stale async sort results and applies the latest rerun result', async () => {
		const firstDeferred = createDeferred<TestVisibleItems>();
		const secondDeferred = createDeferred<TestVisibleItems>();

		const firstVisibleItem = createItem({
			height: 80,
			id: 'first-visible',
			y: 100,
		});
		const secondVisibleItem = createItem({
			height: 80,
			id: 'second-visible',
			y: 160,
		});

		const firstSorted: TestVisibleItems = [
			createItem({ height: 80, id: 'stale-result', y: 100 }),
		];
		const secondSorted: TestVisibleItems = [
			createItem({ height: 80, id: 'fresh-result', y: 160 }),
		];

		const matrix = createMatrixFacade();

		vi.mocked(matrix.sort)
			.mockImplementationOnce(() => firstDeferred.promise)
			.mockImplementationOnce(() => secondDeferred.promise);

		const { hook, matrixColumns } = mountHook({
			matrix,
			matrixColumns: [[firstVisibleItem]],
			overscanPx: 0,
			rootTop: -100,
			viewportHeight: 120,
		});

		await flush(1);

		expect(matrix.sort).toHaveBeenCalledTimes(1);

		matrixColumns.value = [[secondVisibleItem]];

		await flush(1);

		expect(matrix.sort).toHaveBeenCalledTimes(1);

		firstDeferred.resolve(firstSorted);

		await flush(2);

		expect(matrix.sort).toHaveBeenCalledTimes(2);
		expect(hook.visibleItems.value).toStrictEqual([]);

		secondDeferred.resolve(secondSorted);

		await flush();

		expect(hook.visibleItems.value).toStrictEqual(secondSorted);
	});

	test('resets visibleItems when sort fails', async () => {
		const matrix = createMatrixFacade();
		const stableItems: TestVisibleItems = [
			createItem({ height: 100, id: 'stable', y: 50 }),
		];

		vi.mocked(matrix.sort)
			.mockResolvedValueOnce(stableItems)
			.mockRejectedValueOnce(new Error('sort failed'));

		const { hook } = mountHook({
			matrix,
			matrixColumns: [[createItem({ height: 100, id: 'a', y: 50 })]],
			overscanPx: 0,
			rootTop: -50,
			viewportHeight: 200,
		});

		await flush();

		expect(hook.visibleItems.value).toStrictEqual(stableItems);

		vueuseState.rootTop!.value = -120;

		await flush();

		expect(hook.visibleItems.value).toStrictEqual([]);
	});
});
