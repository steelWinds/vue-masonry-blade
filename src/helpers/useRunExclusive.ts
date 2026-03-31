export const useRunExclusive = () => {
	let operationQueue = Promise.resolve();

	const runExclusive = <T>(task: () => Promise<T>) => {
		const nextTask = operationQueue.then(task, task);

		operationQueue = nextTask.then(
			() => undefined,
			() => undefined,
		);

		return nextTask;
	};

	return {
		runExclusive,
	};
};
