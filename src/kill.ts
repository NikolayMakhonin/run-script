import {clearRunStates, getRunStates} from './run-state'
import {printError, printRunStates} from './log'
import {RunStatus} from './contracts'
import {finalizeCurrentProcess} from '@flemist/kill-process'

let _wasKillAll
export function wasKillAll() {
	return _wasKillAll
}

const processList = []
export function addProcess(proc) {
	processList.push(proc)
}

process.on('SIGTERM', () => {
	console.log('SIGTERM')
	killAll({isFailure: true})
})
process.on('SIGHUP', () => {
	console.log('SIGHUP')
	killAll({isFailure: true})
})
process.on('SIGINT', () => {
	console.log('SIGINT')
	killAll({isFailure: true})
})
process.on('SIGBREAK', () => {
	console.log('SIGBREAK')
	killAll({isFailure: true})
})

process.on('beforeExit', () => {
	// console.log('beforeExit')
	killAll({isFailure: false})
})
process.on('exit', () => {
	console.log('exit')
	killAll({isFailure: false})
})

// process.on('disconnect', killAll)
process.on('uncaughtException', err => {
	printError('uncaughtException', err)
	killAll({isFailure: true})
})

export function killAll({
	isFailure,
}: {
	isFailure: boolean,
}) {
	if (_wasKillAll) {
		return
	}
	_wasKillAll = true

	console.log('Terminating...')

	// const procs = processList.filter(o => o.pid && !o.killed && o.pid !== process.pid)
	// const pids = procs.map(o => o.pid)

	printRunStates()

	finalizeCurrentProcess({
		description  : 'run-script killAll',
		firstDelay   : 100,
		softKillDelay: 1000,
	})

	if (getRunStates().some(o => o.status === RunStatus.ERROR)) {
		isFailure = true
	}
	clearRunStates()

	if (isFailure) {
		// eslint-disable-next-line no-process-exit
		process.exit(1)
	}
}
