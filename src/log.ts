import colors from 'kleur'
import {Func, RunStatus} from './contracts'
import {addRunState, getRunStates} from './run-state'
import {wasKillAll} from './kill'

export function printError(prefix, err) {
	console.error(colors.red().bold(`${prefix}: ${err && err.stack || err && err.toString() || err}`))
}

export function printRunState(status: RunStatus, timeStart: number, timeEnd: number, description: string) {
	const message = `${status} (${
		((timeEnd || Date.now()) - timeStart) / 1000
	} sec): ${description}`

	switch (status) {
		case RunStatus.RUNNED:
			console.log(colors.blue(message))
			break
		case RunStatus.SUCCESS:
			console.log(colors.cyan(message))
			break
		case RunStatus.ERROR:
			console.error(colors.red(message))
			break
		default:
			throw new Error(`Unknown status: ${status}`)
	}
}

export function printRunStates() {
	const runStates = getRunStates()
	for (let i = 0; i < runStates.length; i++) {
		const state = runStates[i]
		printRunState(state.status, state.timeStart, state.timeEnd, state.description)
	}
}

export function funcLog<TThis, TArgs extends any[], TValue = void>(
	func: Func<TThis, TArgs, TValue>,
): Func<TThis, TArgs, Promise<TValue extends Promise<infer T> ? T : TValue>>
export function funcLog<TThis, TArgs extends any[], TValue = void>(
	description: string,
	func: Func<TThis, TArgs, TValue>,
): Func<TThis, TArgs, Promise<TValue extends Promise<infer T> ? T : TValue>>
export function funcLog<TThis, TArgs extends any[], TValue = void>(
	descriptionOrFunc: string | Func<TThis, TArgs, TValue>,
	func?: Func<TThis, TArgs, TValue>,
): Func<TThis, TArgs, Promise<TValue extends Promise<infer T> ? T : TValue>>
export function funcLog<TThis, TArgs extends any[], TValue = void>(
	descriptionOrFunc: string | Func<TThis, TArgs, TValue>,
	func?: Func<TThis, TArgs, TValue>,
): Func<TThis, TArgs, Promise<TValue extends Promise<infer T> ? T : TValue>> {
	return async function _funcLog(this: TThis, ...args: TArgs) {
		let description: string
		if (typeof descriptionOrFunc === 'string') {
			description = descriptionOrFunc
		} else {
			func = descriptionOrFunc
			const funcName = func.name || 'anonymous'
			description = `${funcName}(${JSON.stringify(args).replace(/^\[|]$/g, '')})`
		}

		console.log(colors.blue(`RUN: ${description}`))

		const runState = addRunState({
			status   : RunStatus.RUNNED,
			timeStart: Date.now(),
			timeEnd  : void 0,
			description,
		})

		try {
			const result = await func.call(this, ...args)
			runState.status = RunStatus.SUCCESS
			runState.timeEnd = Date.now()
			printRunState(runState.status, runState.timeStart, runState.timeEnd, runState.description)
			return result
		} catch (err) {
			runState.status = RunStatus.ERROR
			runState.timeEnd = Date.now()
			if (!wasKillAll()) {
				console.error(colors.bold().red(`✗ ${description}\r\n${err && err.stack || err && err.toString() || err}`))
				printRunState(runState.status, runState.timeStart, runState.timeEnd, runState.description)
			}
			throw err
		}
	}
}
