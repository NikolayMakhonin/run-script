// eslint-disable-next-line no-extend-native
import {Func} from './contracts'
import {funcLog} from './log'

export function singleProcess<TThis, TArgs extends any[], TValue = void>(
	func: Func<TThis, TArgs, TValue>,
): Func<TThis, TArgs, Promise<TValue extends Promise<infer T> ? T : TValue>>
export function singleProcess<TThis, TArgs extends any[], TValue = void>(
	description: string,
	func: Func<TThis, TArgs, TValue>,
): Func<TThis, TArgs, Promise<TValue extends Promise<infer T> ? T : TValue>>
export function singleProcess<TThis, TArgs extends any[], TValue = void>(
	descriptionOrFunc: string | Func<TThis, TArgs, TValue>,
	func?: Func<TThis, TArgs, TValue>,
): Func<TThis, TArgs, Promise<TValue extends Promise<infer T> ? T : TValue>> {
	let locker: TValue
	return async function _singleProcess(this: TThis, ...args: TArgs) {
		await locker
		locker = funcLog(descriptionOrFunc, func).call(this, ...args)
		return locker as any
	}
}

function sortObjectKeys(obj) {
	if (obj == null) {
		return obj
	}

	if (Array.isArray(obj)) {
		return obj.map(sortObjectKeys)
	}

	if (obj instanceof Object) {
		return Object.keys(obj)
			.sort()
			.reduce((a, key) => {
				a[key] = sortObjectKeys(obj[key])
				return a
			}, {})
	}

	return obj
}

export function singleCall<TThis, TArgs extends any[], TValue = void>(
	func: Func<TThis, TArgs, TValue>,
): Func<TThis, TArgs, TValue>
export function singleCall<TThis, TArgs extends any[], TValue = void>(
	description: string,
	func: Func<TThis, TArgs, TValue>,
): Func<TThis, TArgs, TValue>
export function singleCall<TThis, TArgs extends any[], TValue = void>(
	descriptionOrFunc: string | Func<TThis, TArgs, TValue>,
	func?: Func<TThis, TArgs, TValue>,
): Func<TThis, TArgs, TValue> {
	const cache = {}

	return function _singleCall(...args) {
		const id = JSON.stringify(sortObjectKeys(args))
		const cacheItem = cache[id]
		if (cacheItem) {
			if (cacheItem.error) {
				throw cacheItem.error
			}
			return cacheItem.result
		}

		if (cacheItem === false) {
			throw new Error(`Recursive call of single call func: ${func || descriptionOrFunc}`)
		}
		cache[id] = false

		try {
			const result = funcLog(descriptionOrFunc, func).call(this, ...args)
			cache[id] = {result}
			return result
		} catch (error) {
			cache[id] = {error}
			throw error
		}
	}
}

export async function withTimeout<T>(description: string, timeoutMs: number, func: () => Promise<T>): Promise<T> {
	if (!timeoutMs) {
		return func()
	}

	let timer: NodeJS.Timeout
	const timeoutPromise = new Promise<T>((resolve, reject) => {
		timer = setTimeout(() => reject(new Error(`Timeout expired (${timeoutMs}): ${description}`)), timeoutMs)
	})
	try {
		return await Promise.race([
			func(),
			timeoutPromise,
		])
	} finally {
		if (timer) {
			clearTimeout(timer)
		}
	}
}
