import type { Breakpoints } from 'src/composables/useMasonryMatrix';
import type { MatrixSourceUnit } from 'masonry-blade';

export interface DynamicMatrixProps<Meta = any> {
	items?: MatrixSourceUnit<Meta>[];
	overscanPx?: number;
	columnCount?: number;
	gap?: number;
	breakpoints?: Breakpoints;
}
