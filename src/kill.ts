import psTree from 'ps-tree'
import {spawn} from 'child_process'
import {clearRunStates, getRunStates} from './run-state'
import {printError, printRunStates} from './log'
import {RunStatus} from './contracts'

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

function _killByPidsUnix(...pids) {
	if (!pids.length) {
		return
	}

	const params = pids.map(o => o.toString())
	params.unshift('-15')
	console.log(`kill ${params.join(' ')}`)

	spawn('kill', params, {
		detached: true,
		stdio   : 'ignore',
	})
		// .on('error', err => printError('kill error', err))
		.unref()
}

function killByPidsUnix(...pids) {
	if (!pids.length) {
		return
	}

	_killByPidsUnix(...pids)

	for (let i = 0; i < pids.length; i++) {
		psTree(pids[i], (err, children) => {
			if (err) {
				printError('psTree error', err)
				children = []
			}

			_killByPidsUnix(...children.map(o => o.PID))
		})
	}
}

function killByPidsWindows(...pids) {
	if (!pids.length) {
		return
	}

	const params = ['/F', '/T']
	for (let i = 0; i < pids.length; i++) {
		params.push('/PID')
		params.push(pids[i].toString())
	}
	console.log(`taskkill ${params.join(' ')}`)
	spawn('taskkill', params, {
		detached: true,
		stdio   : 'ignore',
	})
		// .on('error', err => printError('kill error', err))
		.unref()
}

function killByPids(...pids) {
	if (pids.length) {
		// console.log(`Kill All: ${pids.join(' ')}`)
		if (process.platform === 'win32') {
			killByPidsWindows(...pids)
		} else {
			killByPidsUnix(...pids)
		}
	}
}

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

		printRunStates()
		killByPids(...pids)
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
