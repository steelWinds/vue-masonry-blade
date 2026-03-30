import { type Breakpoints, useMasonryMatrix } from './useMasonryMatrix';
import { type MaybeComputedElementRef } from '@vueuse/core';
import { type MaybeRef } from 'vue';
import { useVirtualMasonry } from './useVirtualMasonry';

export interface UseMasonryOptions {
	gap: MaybeRef<number>;
	columnCount: MaybeRef<number>;
	breakpoints?: MaybeRef<Breakpoints | undefined>;
	overscanPx?: MaybeRef<number | undefined>;
}

export const useMasonry = <Meta = unknown>(
	rootRef: MaybeComputedElementRef,
	options: UseMasonryOptions,
) => {
	const masonryMatrix = useMasonryMatrix<Meta>(
		rootRef,
		options.gap,
		options.columnCount,
		options.breakpoints,
	);

	const virtualMasonry = useVirtualMasonry<Meta>(
		rootRef,
		masonryMatrix.matrix,
		masonryMatrix.matrixColumns,
		{
			overscanPx: options.overscanPx,
		},
	);

	return {
		...masonryMatrix,
		...virtualMasonry,
	};
};
