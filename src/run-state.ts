import {TRunState} from './contracts'

const runStates: TRunState[] = []

export function addRunState(runState: TRunState): TRunState {
	runStates.push(runState)
	return runState
}

export function getRunStates(): TRunState[] {
	return runStates
}

export function clearRunStates() {
	runStates.length = 0
}

