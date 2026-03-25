import { shallowRef } from 'vue';
import { tryOnBeforeUnmount } from '@vueuse/core';

export interface ImageItem {
	id: number | string;
	meta: {
		src: string;
		author: string;
	};
	width: number;
	height: number;
}

interface PicsumImageDto {
	id: string;
	download_url: string;
	width: number;
	height: number;
	author: string;
}

type FetchMode = 'replace' | 'pagination';

const PICSUM_API_URL = 'https://picsum.photos/v2/list';
const DEFAULT_PAGE_SIZE = 30;

export const usePicsumImages = (pageSize = DEFAULT_PAGE_SIZE) => {
	const pending = shallowRef(false);
	const error = shallowRef<Error | null>(null);
	const hasMore = shallowRef(true);

	let nextPage = 1;
	let requestId = 0;
	let controller: AbortController | null = null;
	let buffer: ImageItem[] = [];
	let seenIds = new Set<string>();

	const normalizedPageSize =
		Number.isFinite(pageSize) && pageSize > 0
			? Math.trunc(pageSize)
			: DEFAULT_PAGE_SIZE;

	const normalizeCount = (count: number) => {
		if (!Number.isFinite(count)) {
			return 0;
		}

		return Math.max(0, Math.trunc(count));
	};

	const isAbortError = (value: unknown) =>
		value instanceof DOMException && value.name === 'AbortError';

	const toError = (value: unknown) =>
		value instanceof Error ? value : new Error('Error while loading images');

	const mapImage = (item: PicsumImageDto): ImageItem => ({
		height: item.height,
		id: item.id,
		meta: {
			author: item.author,
			src: `https://picsum.photos/id/${item.id}`,
		},
		width: item.width,
	});

	const resetPagination = () => {
		nextPage = 1;
		buffer = [];
		seenIds = new Set<string>();
		hasMore.value = true;
	};

	const cancel = () => {
		controller?.abort();
		controller = null;
	};

	const takeFromBuffer = (count: number) => buffer.splice(0, count);

	const fetchPage = async (page: number, signal: AbortSignal) => {
		const response = await fetch(
			`${PICSUM_API_URL}?page=${page}&limit=${normalizedPageSize}`,
			{
				headers: {
					Accept: 'application/json',
				},
				signal,
			},
		);

		if (!response.ok) {
			throw new Error(
				`Ошибка загрузки: ${response.status} ${response.statusText}`,
			);
		}

		const data = await response.json();

		if (!Array.isArray(data)) {
			throw new Error('Некорректный ответ от Picsum API');
		}

		return data as PicsumImageDto[];
	};

	const ensureBuffer = async (count: number, signal: AbortSignal) => {
		while (buffer.length < count && hasMore.value) {
			const pageItems = await fetchPage(nextPage, signal);

			if (!pageItems.length) {
				hasMore.value = false;
				break;
			}

			nextPage += 1;

			const freshItems = pageItems.map(mapImage).filter((item) => {
				const key = String(item.id);

				if (seenIds.has(key)) {
					return false;
				}

				seenIds.add(key);
				return true;
			});

			buffer.push(...freshItems);

			if (pageItems.length < normalizedPageSize) {
				hasMore.value = false;
			}
		}
	};

	const fetchImages = async (
		count: number,
		mode: FetchMode = 'replace',
	): Promise<ImageItem[]> => {
		const normalizedCount = normalizeCount(count);

		cancel();

		const currentRequestId = ++requestId;
		const currentController = new AbortController();

		controller = currentController;
		pending.value = true;
		error.value = null;

		if (mode === 'replace') {
			resetPagination();
		}

		try {
			if (normalizedCount === 0) {
				return [];
			}

			await ensureBuffer(normalizedCount, currentController.signal);

			if (currentController.signal.aborted || currentRequestId !== requestId) {
				return [];
			}

			return takeFromBuffer(normalizedCount);
		} catch (value) {
			if (!isAbortError(value) && currentRequestId === requestId) {
				error.value = toError(value);
			}

			return [];
		} finally {
			if (currentRequestId === requestId) {
				pending.value = false;
			}

			if (controller === currentController) {
				controller = null;
			}
		}
	};

	tryOnBeforeUnmount(() => {
		cancel();
	});

	return {
		cancel,
		error,
		fetchImages,
		hasMore,
		pending,
		resetPagination,
	};
};
