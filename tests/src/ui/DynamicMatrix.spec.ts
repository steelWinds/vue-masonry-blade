import * as fc from 'fast-check';
import { DynamicMatrix, type DynamicMatrixProps } from 'src/ui';
import type {
	MasonryMatrix,
	MatrixComputedUnit,
	MatrixSourceUnit,
	ReadonlyMatrix,
	ReadonlySortItems,
} from 'masonry-blade';
import {
	type Ref,
	type ShallowRef,
	computed,
	h,
	nextTick,
	ref,
	shallowRef,
} from 'vue';
import { type VueWrapper, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { FAKER_SEED } from 'tests/constants';
import { faker } from '@faker-js/faker';

const vueMocks = vi.hoisted(() => ({
	useTemplateRefMock: vi.fn(),
}));

const composablesMocks = vi.hoisted(() => ({
	useMasonryMatrixMock: vi.fn(),
	useVirtualMasonryMock: vi.fn(),
}));

const libMocks = vi.hoisted(() => ({
	getPositionedStyleMock: vi.fn(),
}));

vi.mock('vue', async () => {
	const actual = await vi.importActual<typeof import('vue')>('vue');

	return {
		...actual,
		useTemplateRef: vueMocks.useTemplateRefMock,
	};
});

vi.mock('src/composables', () => ({
	useMasonryMatrix: composablesMocks.useMasonryMatrixMock,
	useVirtualMasonry: composablesMocks.useVirtualMasonryMock,
}));

vi.mock('src/lib', () => ({
	getPositionedStyle: libMocks.getPositionedStyleMock,
}));

type TestMeta = Readonly<{
	label: string;
	order: number;
}>;

type TestItem = Readonly<MatrixComputedUnit<TestMeta>>;
type TestMatrix = MasonryMatrix<TestMeta>;

type DynamicMatrixExposed = {
	append: (
		items: readonly Readonly<MatrixSourceUnit<TestMeta>>[],
	) => Promise<ReadonlyMatrix<TestMeta>>;
};

type UseMasonryMatrixReturn = Readonly<{
	append: DynamicMatrixExposed['append'];
	clear: () => Promise<ReadonlyMatrix<TestMeta>>;
	containerHeight: ShallowRef<number>;
	disableWorker: () => void;
	enableWorker: () => void;
	matrix: ShallowRef<TestMatrix | null>;
	matrixColumns: ShallowRef<ReadonlyMatrix<TestMeta>>;
	recreate: (
		items?: readonly Readonly<MatrixSourceUnit<TestMeta>>[],
	) => Promise<ReadonlyMatrix<TestMeta>>;
	resolvedColumnCount: Readonly<Ref<number>>;
	sort: (
		source?: ReadonlyMatrix<TestMeta>,
	) => Promise<ReadonlySortItems<TestMeta>>;
	sourceItems: ShallowRef<readonly Readonly<MatrixSourceUnit<TestMeta>>[]>;
	terminateWorker: () => void;
}>;

type UseVirtualMasonryReturn = Readonly<{
	overscanPx: Readonly<Ref<number>>;
	rangeEnd: Readonly<Ref<number>>;
	rangeStart: Readonly<Ref<number>>;
	visibleItems: ShallowRef<ReadonlySortItems<TestMeta>>;
	visibleMatrix: Readonly<Ref<ReadonlyMatrix<TestMeta>>>;
}>;

const createMeta = (overrides: Partial<TestMeta> = {}): TestMeta => ({
	label: overrides.label ?? faker.lorem.word(),
	order: overrides.order ?? faker.number.int({ max: 10_000, min: 1 }),
});

const createItem = (overrides: Partial<TestItem> = {}): TestItem => ({
	height: overrides.height ?? faker.number.int({ max: 500, min: 80 }),
	id: overrides.id ?? faker.string.alphanumeric({ length: 10 }),
	meta: overrides.meta ?? createMeta(),
	width: overrides.width ?? faker.number.int({ max: 400, min: 80 }),
	x: overrides.x ?? faker.number.int({ max: 1_000, min: 0 }),
	y: overrides.y ?? faker.number.int({ max: 3_000, min: 0 }),
});

const createBreakpoints = (): NonNullable<
	DynamicMatrixProps<TestMeta>['breakpoints']
> => ({
	1024: 4,
	640: 2,
	768: 3,
});

const createProps = (
	overrides: Partial<DynamicMatrixProps<TestMeta>> = {},
): DynamicMatrixProps<TestMeta> => ({
	breakpoints: overrides.breakpoints ?? createBreakpoints(),
	columnCount: overrides.columnCount ?? 3,
	gap: overrides.gap ?? 24,
	items: [],
	overscanPx: overrides.overscanPx ?? 120,
});

const positiveIntegerArbitrary = fc.integer({
	max: 5_000,
	min: 1,
});

const testMetaArbitrary: fc.Arbitrary<TestMeta> = fc.record({
	label: fc.string({ maxLength: 20, minLength: 1 }),
	order: fc.integer({ max: 10_000, min: 1 }),
});

const testItemArbitrary: fc.Arbitrary<TestItem> = fc.record({
	height: positiveIntegerArbitrary,
	id: fc.oneof(
		fc.string({ maxLength: 20, minLength: 1 }),
		fc.integer({
			max: Number.MAX_SAFE_INTEGER,
			min: Number.MIN_SAFE_INTEGER,
		}),
	),
	meta: testMetaArbitrary,
	width: positiveIntegerArbitrary,
	x: fc.integer({ max: 10_000, min: 0 }),
	y: fc.integer({ max: 50_000, min: 0 }),
});

describe('DynamicMatrix', () => {
	const { useTemplateRefMock } = vueMocks;
	const { useMasonryMatrixMock, useVirtualMasonryMock } = composablesMocks;
	const { getPositionedStyleMock } = libMocks;

	let rootRefMock: Ref<HTMLDivElement | null>;
	let matrixRef: ShallowRef<TestMatrix | null>;
	let matrixColumnsRef: ShallowRef<ReadonlyMatrix<TestMeta>>;
	let containerHeightRef: ShallowRef<number>;
	let visibleItemsRef: ShallowRef<ReadonlySortItems<TestMeta>>;
	let appendMock: DynamicMatrixExposed['append'];
	let clearMock: UseMasonryMatrixReturn['clear'];
	let recreateMock: UseMasonryMatrixReturn['recreate'];
	let sortMock: UseMasonryMatrixReturn['sort'];
	let terminateWorkerMock: UseMasonryMatrixReturn['terminateWorker'];
	let disableWorkerMock: UseMasonryMatrixReturn['disableWorker'];
	let enableWorkerMock: UseMasonryMatrixReturn['enableWorker'];

	const createWrapper = (
		props: Partial<DynamicMatrixProps<TestMeta>> = {},
	): VueWrapper<DynamicMatrixExposed> =>
		mount(DynamicMatrix, {
			props: createProps(props) as any,
			slots: {
				default: ({ item, positionedStyle }) =>
					h(
						'article',
						{
							class: 'matrix-item',
							'data-height': String(positionedStyle.height),
							'data-id': String(item.id),
							'data-transform': String(positionedStyle.transform),
							'data-width': String(positionedStyle.width),
						},
						[
							h(
								'span',
								{ class: 'matrix-item__label' },
								String((item.meta as any)?.label ?? ''),
							),
							h(
								'span',
								{ class: 'matrix-item__order' },
								String((item.meta as any)?.order ?? ''),
							),
						],
					),
			},
		}) as VueWrapper<DynamicMatrixExposed>;

	beforeEach(() => {
		faker.seed(FAKER_SEED);

		rootRefMock = ref(null);

		matrixRef = shallowRef({} as TestMatrix);
		matrixColumnsRef = shallowRef<ReadonlyMatrix<TestMeta>>([]);
		containerHeightRef = shallowRef(480);
		visibleItemsRef = shallowRef<ReadonlySortItems<TestMeta>>([]);

		appendMock = vi.fn(async () => matrixColumnsRef.value);
		clearMock = vi.fn(async () => []);
		recreateMock = vi.fn(async () => matrixColumnsRef.value);
		sortMock = vi.fn(async () => visibleItemsRef.value);
		terminateWorkerMock = vi.fn();
		disableWorkerMock = vi.fn();
		enableWorkerMock = vi.fn();

		useTemplateRefMock.mockReset();
		useMasonryMatrixMock.mockReset();
		useVirtualMasonryMock.mockReset();
		getPositionedStyleMock.mockReset();

		useTemplateRefMock.mockReturnValue(rootRefMock);

		const masonryReturn: UseMasonryMatrixReturn = {
			append: appendMock,
			clear: clearMock,
			containerHeight: containerHeightRef,
			disableWorker: disableWorkerMock,
			enableWorker: enableWorkerMock,
			matrix: matrixRef,
			matrixColumns: matrixColumnsRef,
			recreate: recreateMock,
			resolvedColumnCount: computed(() => 3),
			sort: sortMock,
			sourceItems: shallowRef([]),
			terminateWorker: terminateWorkerMock,
		};

		const virtualReturn: UseVirtualMasonryReturn = {
			overscanPx: computed(() => 120),
			rangeEnd: computed(() => 1_000),
			rangeStart: computed(() => 0),
			visibleItems: visibleItemsRef,
			visibleMatrix: computed(() => matrixColumnsRef.value),
		};

		useMasonryMatrixMock.mockReturnValue(masonryReturn);
		useVirtualMasonryMock.mockReturnValue(virtualReturn);

		getPositionedStyleMock.mockImplementation((item: TestItem) => ({
			height: `${item.height}px`,
			transform: `translate(${item.x}px, ${item.y}px)`,
			width: `${item.width}px`,
		}));
	});

	test('passes rootRef and reactive props into useMasonryMatrix', () => {
		const props = createProps({
			breakpoints: {
				1440: 6,
				480: 1,
				900: 3,
			},
			columnCount: 5,
			gap: 18,
		});

		createWrapper(props);

		expect(useTemplateRefMock).toHaveBeenCalledTimes(1);
		expect(useTemplateRefMock).toHaveBeenCalledWith('root');

		expect(useMasonryMatrixMock).toHaveBeenCalledTimes(1);

		const [rootRefArg, gapArg, columnCountArg, breakpointsArg] =
			useMasonryMatrixMock.mock.calls[0]!;

		expect(rootRefArg).toBe(rootRefMock);
		expect(gapArg.value).toBe(18);
		expect(columnCountArg.value).toBe(5);
		expect(breakpointsArg.value).toEqual({
			1440: 6,
			480: 1,
			900: 3,
		});
	});

	test('passes rootRef, matrix ref, matrixColumns ref and overscan into useVirtualMasonry', () => {
		createWrapper({
			overscanPx: 256,
		});

		expect(useVirtualMasonryMock).toHaveBeenCalledTimes(1);

		const [rootRefArg, matrixArg, matrixColumnsArg, optionsArg] =
			useVirtualMasonryMock.mock.calls[0]!;

		expect(rootRefArg).toBe(rootRefMock);
		expect(matrixArg).toBe(matrixRef);
		expect(matrixColumnsArg).toBe(matrixColumnsRef);
		expect(optionsArg.overscanPx.value).toBe(256);
	});

	test('renders root container height from containerHeight', () => {
		const wrapper = createWrapper();

		expect(wrapper.get('.masonry').attributes('style')).toContain(
			'height: 480px;',
		);
	});

	test('updates root container height reactively', async () => {
		const wrapper = createWrapper();

		containerHeightRef.value = 920;
		await nextTick();

		expect(wrapper.get('.masonry').attributes('style')).toContain(
			'height: 920px;',
		);
	});

	test('renders visibleItems through slot', () => {
		visibleItemsRef.value = [
			createItem({
				height: 320,
				id: 'first',
				meta: createMeta({ label: 'alpha', order: 1 }),
				width: 200,
				x: 0,
				y: 0,
			}),
			createItem({
				height: 280,
				id: 'second',
				meta: createMeta({ label: 'beta', order: 2 }),
				width: 180,
				x: 224,
				y: 48,
			}),
		];

		const wrapper = createWrapper();
		const items = wrapper.findAll('.matrix-item');

		expect(items).toHaveLength(2);
		expect(items[0]!.attributes('data-id')).toBe('first');
		expect(items[0]!.find('.matrix-item__label').text()).toBe('alpha');
		expect(items[0]!.find('.matrix-item__order').text()).toBe('1');

		expect(items[1]!.attributes('data-id')).toBe('second');
		expect(items[1]!.find('.matrix-item__label').text()).toBe('beta');
		expect(items[1]!.find('.matrix-item__order').text()).toBe('2');
	});

	test('passes positioned style from getPositionedStyle into slot props', () => {
		const item = createItem({
			height: 320,
			id: 'positioned',
			width: 180,
			x: 16,
			y: 48,
		});

		visibleItemsRef.value = [item];

		const wrapper = createWrapper();
		const renderedItem = wrapper.get('.matrix-item');

		expect(getPositionedStyleMock).toHaveBeenCalledTimes(1);
		expect(getPositionedStyleMock).toHaveBeenCalledWith(item);

		expect(renderedItem.attributes('data-width')).toBe('180px');
		expect(renderedItem.attributes('data-height')).toBe('320px');
		expect(renderedItem.attributes('data-transform')).toBe(
			'translate(16px, 48px)',
		);
	});

	test('rerenders when visibleItems changes reactively', async () => {
		const wrapper = createWrapper();

		expect(wrapper.findAll('.matrix-item')).toHaveLength(0);

		visibleItemsRef.value = [
			createItem({
				id: 'later-1',
				meta: createMeta({ label: 'later alpha', order: 10 }),
			}),
			createItem({
				id: 'later-2',
				meta: createMeta({ label: 'later beta', order: 11 }),
			}),
		];

		await nextTick();

		const items = wrapper.findAll('.matrix-item');

		expect(items).toHaveLength(2);
		expect(items[0]!.attributes('data-id')).toBe('later-1');
		expect(items[1]!.attributes('data-id')).toBe('later-2');
	});

	test('preserves visibleItems order in rendered output', () => {
		visibleItemsRef.value = [
			createItem({ id: 'a' }),
			createItem({ id: 'b' }),
			createItem({ id: 'c' }),
		];

		const wrapper = createWrapper();

		const ids = wrapper
			.findAll('.matrix-item')
			.map((node) => node.attributes('data-id'));

		expect(ids).toEqual(['a', 'b', 'c']);
	});

	test('exposes append returned by useMasonryMatrix', () => {
		const wrapper = createWrapper();

		expect(wrapper.vm.append).toBe(appendMock);
	});

	test('uses default columnCount and gap props when omitted', () => {
		mount(DynamicMatrix, {
			props: {
				overscanPx: 80,
			} as any,
		});

		const [, gapArg, columnCountArg] = useMasonryMatrixMock.mock.calls[0]!;

		expect(gapArg.value).toBe(10);
		expect(columnCountArg.value).toBe(1);
	});

	test('tracks prop updates through computed arguments passed to composables', async () => {
		const wrapper = createWrapper({
			columnCount: 2,
			gap: 12,
			overscanPx: 32,
		});

		const [, gapArg, columnCountArg] = useMasonryMatrixMock.mock.calls[0]!;
		const [, , , optionsArg] = useVirtualMasonryMock.mock.calls[0]!;

		expect(gapArg.value).toBe(12);
		expect(columnCountArg.value).toBe(2);
		expect(optionsArg.overscanPx.value).toBe(32);

		await wrapper.setProps({
			columnCount: 6,
			gap: 30,
			overscanPx: 220,
		});

		expect(gapArg.value).toBe(30);
		expect(columnCountArg.value).toBe(6);
		expect(optionsArg.overscanPx.value).toBe(220);
	});

	test('renders arbitrary visibleItems consistently', () => {
		fc.assert(
			fc.property(
				fc.array(testItemArbitrary, {
					maxLength: 10,
					minLength: 1,
				}),
				(items) => {
					visibleItemsRef.value = items;

					const wrapper = createWrapper();
					const renderedItems = wrapper.findAll('.matrix-item');

					expect(renderedItems).toHaveLength(items.length);

					for (const [index, item] of items.entries()) {
						const renderedItem = renderedItems[index]!;

						expect(renderedItem.attributes('data-id')).toBe(String(item.id));
						expect(renderedItem.attributes('data-width')).toBe(
							`${item.width}px`,
						);
						expect(renderedItem.attributes('data-height')).toBe(
							`${item.height}px`,
						);
						expect(renderedItem.attributes('data-transform')).toBe(
							`translate(${item.x}px, ${item.y}px)`,
						);
						expect(renderedItem.find('.matrix-item__label').text().trim()).toBe(
							item.meta!.label.trim(),
						);
						expect(renderedItem.find('.matrix-item__order').text()).toBe(
							String(item.meta!.order),
						);
					}

					wrapper.unmount();
				},
			),
			{
				numRuns: 50,
				seed: FAKER_SEED,
			},
		);
	});
});
