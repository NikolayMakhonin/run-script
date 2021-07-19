// eslint-disable-next-line no-extend-native

export type Func<TThis, TArgs extends any[], TValue = void> = (this: TThis, ...args: TArgs) => TValue

export function singleProcess<TThis, TArgs extends any[], TValue = void>(
	func: Func<TThis, TArgs, TValue>,
): Func<TThis, TArgs, Promise<TValue extends Promise<infer T> ? T : TValue>> {
	let locker: TValue
	return async function _singleProcess(this: TThis, ...args: TArgs) {
		await locker
		locker = func.call(this, ...args)
		return locker as any
	}
}

export function singleCall<TThis, TArgs extends any[], TValue = void>(
	func: Func<TThis, TArgs, TValue>,
): Func<TThis, TArgs, TValue> {
	const cache = {}

	return function _singleCall(...args) {
		const id = JSON.stringify(args)
		const cacheItem = cache[id]
		if (cacheItem) {
			if (cacheItem.error) {
				throw cacheItem.error
			}
			return cacheItem.result
		}

		if (cacheItem === false) {
			throw new Error(`Recursive call of single call func: ${func.toString()}`)
		}
		cache[id] = false

		try {
			const result = func.call(this, ...args)
			cache[id] = {result}
			return result
		} catch (error) {
			cache[id] = {error}
			throw error
		}
	}
}
