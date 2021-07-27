import {clearRunStates, getRunStates} from './run-state'
import {printError, printRunStates} from './log'
import {RunStatus} from './contracts'
import {treeKill} from '@flemist/simple-tree-kill'

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
	killAll({isFailure: true, syncKill: true})
})
process.on('SIGHUP', () => {
	console.log('SIGHUP')
	killAll({isFailure: true, syncKill: true})
})
process.on('SIGINT', () => {
	console.log('SIGINT')
	killAll({isFailure: true, syncKill: true})
})
process.on('SIGBREAK', () => {
	console.log('SIGBREAK')
	killAll({isFailure: true, syncKill: true})
})

process.on('beforeExit', () => {
	// console.log('beforeExit')
	killAll({isFailure: false, syncKill: false})
})
process.on('exit', () => {
	console.log('exit')
	killAll({isFailure: false, syncKill: true})
})

// process.on('disconnect', killAll)
process.on('uncaughtException', err => {
	printError('uncaughtException', err)
	killAll({isFailure: true, syncKill: false})
})

export function killAll({
	isFailure,
	syncKill,
}: {
	isFailure: boolean,
	syncKill: boolean,
}) {
	if (_wasKillAll) {
		return
	}
	_wasKillAll = true

	console.log('Terminating...')

	const kill = () => {
		const procs = processList.filter(o => o.pid && !o.killed && o.pid !== process.pid)
		const pids = procs.map(o => o.pid)
		pids.push(process.pid)

		printRunStates()

		treeKill({
			parentsPids: pids,
			ignorePids : [process.pid],
			force      : true,
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

	if (syncKill) {
		kill()
	} else {
		setTimeout(kill, 100)
	}
}
