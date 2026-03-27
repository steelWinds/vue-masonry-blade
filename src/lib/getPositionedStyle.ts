import type { MatrixComputedUnit } from 'masonry-blade';

export const getPositionedStyle = <Meta>(item: MatrixComputedUnit<Meta>) => ({
	height: `${item.height}px`,
	transform: `translate(${item.x}px, ${item.y}px)`,
	width: `${item.width}px`,
});
