import type {
	MatrixComputedUnit,
	MatrixSourceUnit,
	ReadonlyMatrix,
	ReadonlySortItems,
} from 'masonry-blade';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { computed, ref, shallowRef } from 'vue';
import { type Breakpoints } from 'src/composables/useMasonryMatrix';
import { useMasonry } from 'src/composables';

type TestMeta = Readonly<{
	label: string;
	order: number;
}>;

type TestSourceItem = Readonly<MatrixSourceUnit<TestMeta>>;
type TestComputedItem = Readonly<MatrixComputedUnit<TestMeta>>;

const composableMocks = vi.hoisted(() => ({
	useMasonryMatrixMock: vi.fn(),
	useVirtualMasonryMock: vi.fn(),
}));

vi.mock('src/composables/useMasonryMatrix', () => ({
	useMasonryMatrix: composableMocks.useMasonryMatrixMock,
}));

vi.mock('src/composables/useVirtualMasonry', () => ({
	useVirtualMasonry: composableMocks.useVirtualMasonryMock,
}));

const createSourceItem = (
	overrides: Partial<TestSourceItem> = {},
): TestSourceItem => ({
	height: overrides.height ?? 120,
	id: overrides.id ?? 'item-1',
	meta: overrides.meta ?? {
		label: 'alpha',
		order: 1,
	},
	width: overrides.width ?? 80,
});

const createComputedItem = (
	overrides: Partial<TestComputedItem> = {},
): TestComputedItem => ({
	...createSourceItem(overrides),
	x: overrides.x ?? 0,
	y: overrides.y ?? 0,
});

describe('useMasonry', () => {
	beforeEach(() => {
		composableMocks.useMasonryMatrixMock.mockReset();
		composableMocks.useVirtualMasonryMock.mockReset();
	});

	test('wires useMasonryMatrix and useVirtualMasonry with the same rootRef and reactive options', () => {
		const rootRef = shallowRef<HTMLElement | null>(null);
		const gap = ref(18);
		const columnCount = ref(4);
		const breakpoints = ref<Breakpoints | undefined>({
			1024: 4,
			640: 2,
		});
		const overscanPx = ref<number | undefined>(240);

		const matrix = shallowRef({ sort: vi.fn() } as never);
		const matrixColumns = shallowRef<ReadonlyMatrix<TestMeta>>([]);

		composableMocks.useMasonryMatrixMock.mockReturnValue({
			append: vi.fn(),
			clear: vi.fn(),
			containerHeight: shallowRef(0),
			disableWorker: vi.fn(),
			enableWorker: vi.fn(),
			matrix,
			matrixColumns,
			recreate: vi.fn(),
			resolvedColumnCount: computed(() => columnCount.value),
			sort: vi.fn(),
			sourceItems: shallowRef<readonly Readonly<TestSourceItem>[]>([]),
			terminateWorker: vi.fn(),
		});

		composableMocks.useVirtualMasonryMock.mockReturnValue({
			overscanPx,
			rangeEnd: computed(() => 0),
			rangeStart: computed(() => 0),
			visibleItems: shallowRef<ReadonlySortItems<TestMeta>>([]),
			visibleMatrix: computed(() => []),
		});

		useMasonry<TestMeta>(rootRef, {
			breakpoints: computed(() => breakpoints.value),
			columnCount,
			gap,
			overscanPx,
		});

		expect(composableMocks.useMasonryMatrixMock).toHaveBeenCalledTimes(1);
		expect(composableMocks.useMasonryMatrixMock).toHaveBeenCalledWith(
			rootRef,
			gap,
			columnCount,
			expect.objectContaining({
				value: {
					1024: 4,
					640: 2,
				},
			}),
		);

		expect(composableMocks.useVirtualMasonryMock).toHaveBeenCalledTimes(1);
		expect(composableMocks.useVirtualMasonryMock).toHaveBeenCalledWith(
			rootRef,
			matrix,
			matrixColumns,
			{
				overscanPx,
			},
		);
	});

	test('merges the return shape of both hooks into one facade', () => {
		const rootRef = shallowRef<HTMLElement | null>(null);
		const gap = ref(12);
		const columnCount = ref(3);
		const append = vi.fn();
		const recreate = vi.fn();
		const clear = vi.fn();
		const sort = vi.fn();
		const disableWorker = vi.fn();
		const enableWorker = vi.fn();
		const terminateWorker = vi.fn();
		const matrix = shallowRef({ sort: vi.fn() } as never);
		const matrixColumns = shallowRef<ReadonlyMatrix<TestMeta>>([
			[
				createComputedItem({
					id: 'visible-1',
				}),
			],
		]);
		const sourceItems = shallowRef<readonly Readonly<TestSourceItem>[]>([
			createSourceItem({
				id: 'source-1',
			}),
		]);
		const visibleItems = shallowRef<ReadonlySortItems<TestMeta>>([
			createComputedItem({
				id: 'sorted-1',
			}),
		]);
		const visibleMatrix = computed(() => matrixColumns.value);
		const containerHeight = shallowRef(480);
		const resolvedColumnCount = computed(() => columnCount.value);
		const overscanPx = computed(() => 180);
		const rangeStart = computed(() => 120);
		const rangeEnd = computed(() => 720);

		composableMocks.useMasonryMatrixMock.mockReturnValue({
			append,
			clear,
			containerHeight,
			disableWorker,
			enableWorker,
			matrix,
			matrixColumns,
			recreate,
			resolvedColumnCount,
			sort,
			sourceItems,
			terminateWorker,
		});

		composableMocks.useVirtualMasonryMock.mockReturnValue({
			overscanPx,
			rangeEnd,
			rangeStart,
			visibleItems,
			visibleMatrix,
		});

		const hook = useMasonry<TestMeta>(rootRef, {
			columnCount,
			gap,
		});

		expect(hook.append).toBe(append);
		expect(hook.recreate).toBe(recreate);
		expect(hook.clear).toBe(clear);
		expect(hook.sort).toBe(sort);
		expect(hook.disableWorker).toBe(disableWorker);
		expect(hook.enableWorker).toBe(enableWorker);
		expect(hook.terminateWorker).toBe(terminateWorker);
		expect(hook.matrix).toBe(matrix);
		expect(hook.matrixColumns).toBe(matrixColumns);
		expect(hook.sourceItems).toBe(sourceItems);
		expect(hook.containerHeight).toBe(containerHeight);
		expect(hook.resolvedColumnCount).toBe(resolvedColumnCount);
		expect(hook.visibleItems).toBe(visibleItems);
		expect(hook.visibleMatrix).toBe(visibleMatrix);
		expect(hook.overscanPx).toBe(overscanPx);
		expect(hook.rangeStart).toBe(rangeStart);
		expect(hook.rangeEnd).toBe(rangeEnd);
	});
});
