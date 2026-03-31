import { describe, expect, test, vi } from 'vitest';
import { useRunExclusive } from 'src/helpers';

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

describe('useRunExclusive', () => {
	test('returns the resolved task result', async () => {
		const { runExclusive } = useRunExclusive();

		await expect(runExclusive(async () => 42)).resolves.toBe(42);
	});

	test('runs overlapping tasks sequentially', async () => {
		const { runExclusive } = useRunExclusive();
		const firstDeferred = createDeferred<string>();
		const events: string[] = [];
		const secondTask = vi.fn(async () => {
			events.push('second:start');

			return 'second-result';
		});

		const firstPromise = runExclusive(async () => {
			events.push('first:start');

			const result = await firstDeferred.promise;

			events.push('first:finish');

			return result;
		});
		const secondPromise = runExclusive(secondTask);

		await Promise.resolve();

		expect(events).toStrictEqual(['first:start']);
		expect(secondTask).not.toHaveBeenCalled();

		firstDeferred.resolve('first-result');

		await expect(firstPromise).resolves.toBe('first-result');
		await expect(secondPromise).resolves.toBe('second-result');

		expect(secondTask).toHaveBeenCalledTimes(1);
		expect(events).toStrictEqual([
			'first:start',
			'first:finish',
			'second:start',
		]);
	});

	test('continues with the next task after a rejection', async () => {
		const { runExclusive } = useRunExclusive();
		const firstDeferred = createDeferred<never>();
		const secondTask = vi.fn(async () => 'recovered');

		const firstPromise = runExclusive(async () => firstDeferred.promise);
		const firstError = firstPromise.catch((error) => error);
		const secondPromise = runExclusive(secondTask);

		await Promise.resolve();

		expect(secondTask).not.toHaveBeenCalled();

		firstDeferred.reject(new Error('boom'));

		await expect(firstError).resolves.toMatchObject({
			message: 'boom',
		});
		await expect(secondPromise).resolves.toBe('recovered');

		expect(secondTask).toHaveBeenCalledTimes(1);
	});
});
