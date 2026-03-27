import * as fc from 'fast-check';
import { describe, expect, test } from 'vitest';
import { FAKER_SEED } from 'tests/constants';
import type { MatrixComputedUnit } from 'masonry-blade';
import { faker } from '@faker-js/faker';
import { getPositionedStyle } from 'src/lib';

type TestMeta = Readonly<{
	label: string;
	order: number;
}>;

const createMatrixItem = (
	overrides: Partial<MatrixComputedUnit<TestMeta>> = {},
): MatrixComputedUnit<TestMeta> => ({
	height:
		overrides.height ??
		faker.number.float({ fractionDigits: 2, max: 500, min: 1 }),
	id: overrides.id ?? faker.string.uuid(),
	meta: overrides.meta ?? {
		label: faker.word.words(2),
		order: faker.number.int({ max: 100, min: 1 }),
	},
	width:
		overrides.width ??
		faker.number.float({ fractionDigits: 2, max: 500, min: 1 }),
	x:
		overrides.x ??
		faker.number.float({ fractionDigits: 2, max: 500, min: -500 }),
	y:
		overrides.y ??
		faker.number.float({ fractionDigits: 2, max: 500, min: -500 }),
});

describe('getPositionedStyle', () => {
	test('returns positioned style with px units', () => {
		const item = createMatrixItem({
			height: 240,
			width: 160,
			x: 32,
			y: 48,
		});

		expect(getPositionedStyle(item)).toStrictEqual({
			height: '240px',
			transform: 'translate(32px, 48px)',
			width: '160px',
		});
	});

	test('preserves decimal values in output', () => {
		const item = createMatrixItem({
			height: 240.5,
			width: 160.25,
			x: 32.75,
			y: 48.125,
		});

		expect(getPositionedStyle(item)).toStrictEqual({
			height: '240.5px',
			transform: 'translate(32.75px, 48.125px)',
			width: '160.25px',
		});
	});

	test('supports negative coordinates', () => {
		const item = createMatrixItem({
			height: 120,
			width: 80,
			x: -24,
			y: -12,
		});

		expect(getPositionedStyle(item)).toStrictEqual({
			height: '120px',
			transform: 'translate(-24px, -12px)',
			width: '80px',
		});
	});

	test('does not depend on unrelated item fields', () => {
		const first = createMatrixItem({
			height: 100,
			id: 'first',
			meta: { label: 'a', order: 1 },
			width: 200,
			x: 10,
			y: 20,
		});
		const second = createMatrixItem({
			height: 100,
			id: 'second',
			meta: { label: 'b', order: 2 },
			width: 200,
			x: 10,
			y: 20,
		});

		expect(getPositionedStyle(first)).toStrictEqual(getPositionedStyle(second));
	});

	test('maps dimensions and coordinates correctly for arbitrary finite numbers', () => {
		fc.assert(
			fc.property(
				fc.record({
					height: fc.double({ noDefaultInfinity: true, noNaN: true }),
					width: fc.double({ noDefaultInfinity: true, noNaN: true }),
					x: fc.double({ noDefaultInfinity: true, noNaN: true }),
					y: fc.double({ noDefaultInfinity: true, noNaN: true }),
				}),
				({ height, width, x, y }) => {
					const item = createMatrixItem({
						height,
						width,
						x,
						y,
					});

					expect(getPositionedStyle(item)).toStrictEqual({
						height: `${height}px`,
						transform: `translate(${x}px, ${y}px)`,
						width: `${width}px`,
					});
				},
			),
			{
				numRuns: 200,
				seed: FAKER_SEED,
			},
		);
	});
});
