// eslint-disable-next-line max-len
/* eslint-disable no-unused-vars,callback-return,no-process-exit,no-process-env,no-extra-semi,@typescript-eslint/no-extra-semi */
import {spawn} from 'child_process'
import colors from 'kleur'
import {IRunOptions} from './contracts'
import {getGlobalConfig} from './globalConfig'
import path from 'path'
import {lineByLine} from './lineByLine'
import {singleCall, withTimeout} from './helpers'
import {addProcess, killAll, wasKillAll} from './kill'
import {funcLog, printError} from './log'

// region helpers

function escapeRegExp(string) {
	return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // $& means the whole matched string
}

// region color

export function getColorPrefix(colorFunc) {
	const colorText = colorFunc('COLOR')
	return colorText.match(/^(.*)COLOR/s)[1]
}

// eslint-disable-next-line @typescript-eslint/no-shadow
export function createColorRegexp(colors: colors.Color[]) {
	return new RegExp(`[^\\r\\n]*(${colors
		.map(getColorPrefix)
		.map(escapeRegExp)
		.join('|')})[^\\r\\n]*`)
}

export function removeColor(message) {
	// eslint-disable-next-line no-control-regex
	return message.replace(/\u001B\[\d+m/g, '')
}

// endregion

// endregion

// region output handlers

// region stdOutSearchError

// const errorTextRegExp = /\b(err(ors?)?|warn(ings?)?|fail(ed|ure|s)?)\b|[✗]/i
const errorTextRegExp = /[^\r\n]*(\b[1-9]\d* *(fail|err)|[✗×]|fatal error|error occur)[^\r\n]*/i
const errorColorRegExp = createColorRegexp([
	colors.bold,
	colors.red,
	colors.magenta,
	// colors.yellow,
	colors.bgRed,
	colors.bgMagenta,
	// colors.bgYellow,
])

function stdOutSearchErrorGlobal(text: string) {
	return getGlobalConfig().stdOutSearchError
		? getGlobalConfig().stdOutSearchError(text, stdOutSearchErrorDefault)
		: stdOutSearchErrorDefault(text)
}

function stdOutSearchErrorDefault(text: string) {
	const errorColor = text.match(errorColorRegExp)
	text = removeColor(text)

	if (errorColor
		// at least 10 letters
		&& (/(\w\W*){10,}/s).test(text)
		&& !(/√/s).test(text)
		// electron-builder
		&& !(/[┌│]/s).test(text)
		// sapper: "189 kB client.905ef984.js"
		&& !(/\b\d+\s+\w+\s+\S+\.js\b/.test(text) && text.length < 100)
	) {
		return `ERROR COLOR: ${errorColor[0]}`
	}

	const errorText = text.match(errorTextRegExp)
	if (errorText) {
		return `ERROR TEXT: ${errorText[0]}`
	}

	return false
}

// endregion

// region stdErrIsError

function correctLog(message) {
	message = message.replace(/^\s{20,}/, '')
	return message
}

function stdErrIsErrorGlobal(text: string) {
	return getGlobalConfig().stdErrIsError
		? getGlobalConfig().stdErrIsError(text, stdErrIsErrorDefault)
		: stdErrIsErrorDefault(text)
}

function stdErrIsErrorDefault(text: string) {
	text = removeColor(text)

	if (text.length < 20) {
		return false
	}

	if (/openssl config failed/.test(text)) {
		return false
	}

	// web storm
	if (/Debugger attached|Debugger listening on|Waiting for the debugger|nodejs.*inspector/.test(text)) {
		return false
	}

	// rollup
	if (/treating it as an external dependency|\bcreated\b.*\.js in \d|\bFinished in\b/.test(text)) {
		return false
	}
	if (text.indexOf('→') >= 0) {
		return false
	}

	// someone package is outdated
	if (/\bnpm update\b/.test(text)) {
		return false
	}

	// terminate process
	if (/^\^[A-Z]$/.test(text)) {
		return false
	}

	// experimental warnings
	if (/ExperimentalWarning: Conditional exports is an experimental feature. This feature could change at any time/.test(text)) {
		return false
	}

	// Entry module "rollup.config.js" is implicitly using "default" export mode,
	// which means for CommonJS outputthat its default export is assigned to "module.exports".
	// For many tools, such CommonJS output will not be interchangeable with the original ES module.
	// If this is intended, explicitly set "output.exports" to either "auto" or "default",
	// otherwise you might want to consider changing the signature of "rollup.config.js"
	// to use named exports only.
	if (/explicitly set "output.exports" to either "auto" or "default"/.test(text)) {
		return false
	}

	return true
}

// endregion

// region logFilter

function logFilterGlobal(text: string) {
	return getGlobalConfig().logFilter
		? getGlobalConfig().logFilter(text, logFilterDefault)
		: logFilterDefault(text)
}

function logFilterDefault(text: string) {
	text = removeColor(text)

	// sapper export
	if (/\s{4,}\S\s[^\w\r\n]*node_modules/.test(text)) {
		return false
	}

	// Empty space
	if (/^\s*$/s.test(text)) {
		return false
	}

	return true
}

// endregion

// endregion

// interface ProcessEnvOptions {
// 	uid?: number;
// 	gid?: number;
// 	cwd?: string;
// 	env?: NodeJS.ProcessEnv;
// 	/**
// 	 * @default true
// 	 */
// 	windowsHide?: boolean;
// 	/**
// 	 * @default 0
// 	 */
// 	timeout?: number;
// 	argv0?: string;
// 	stdio?: StdioOptions;
// 	detached?: boolean;
// 	shell?: boolean | string;
// 	windowsVerbatimArguments?: boolean;
// 	stdio?: 'pipe' | Array<null | undefined | 'pipe'>;
// }

// Buffer class
// type BufferEncoding = 'ascii' | 'utf8' | 'utf-8' | 'utf16le' | 'ucs2'
// | 'ucs-2' | 'base64' | 'latin1' | 'binary' | 'hex';

interface IRunResult {
	out: string
	err: string
	both: string
}

function _run(command: string, {
	args,
	env,
	cwd,
	timeout,
	notAutoKill,
	stdin,
	shell = true,
	prepareProcess,
	dontSearchErrors,
	ignoreProcessExitCode,
	dontShowOutputs,
	returnOutputs,
	logFilter,
	stdOutSearchError,
	stdErrIsError,
}: IRunOptions = {}): Promise<IRunResult> {
	function _logFilter(text: string) {
		return logFilter
			? logFilter(text, logFilterGlobal)
			: logFilterGlobal(text)
	}

	function _stdOutSearchError(text: string) {
		return stdOutSearchError
			? stdOutSearchError(text, stdOutSearchErrorGlobal)
			: stdOutSearchErrorGlobal(text)
	}

	function _stdErrIsError(text: string) {
		return stdErrIsError
			? stdErrIsError(text, stdErrIsErrorGlobal)
			: stdErrIsErrorGlobal(text)
	}

	return Promise.resolve().then(() => {
		const currentDir = process.cwd()
		cwd = path.resolve(cwd || currentDir)
		let cwdRelative = path.relative(currentDir, cwd)
		if (cwdRelative.startsWith('..')) {
			cwdRelative = cwd
		}
		if (cwdRelative === '.') {
			cwdRelative = ''
		}

		let description = ''
		if (cwdRelative) {
			description += cwdRelative + '> '
		}
		if (timeout) {
			description += '(timeout: ' + Math.round(timeout) + ') '
		}
		description += command

		if (wasKillAll()) {
			return Promise.reject('Was kill all')
		}

		return funcLog(description, () => new Promise<IRunResult>((resolve, reject) => {
			const proc = spawn(
				command,
				args,
				{
					cwd,
					env: {
						...process.env,
						...env,
					},
					timeout,
					stdio: [stdin, 'pipe', 'pipe'],
					shell,
				})

			let stdoutString: string = void 0
			let stderrString: string = void 0
			let stdbothString: string = void 0

			const _resolve = () => {
				Promise.all([
					proc.stdout && new Promise(r => {
						proc.stdout.on('end', r)
						if (proc.stdout.readableEnded) {
							r(void 0)
						}
					}),
					proc.stderr && new Promise(r => {
						proc.stderr.on('end', r)
						if (proc.stderr.readableEnded) {
							r(void 0)
						}
					}),
				])
					.then(() => {
						resolve(
							returnOutputs
								? {
									out : stdoutString,
									err : stderrString,
									both: stdbothString,
								}
								: void 0,
						)
					})
			}

			const _reject = err => {
				reject(err)
			}

			if (returnOutputs) {
				if (proc.stdout) {
					stdoutString = ''
					stdbothString = ''
					proc.stdout.on('data', chunk => {
						// const encoding = proc.stdout.readableEncoding
						const str = chunk.toString() // encoding === 'buffer' ? void 0 : encoding)
						stdoutString += str
						stdbothString += str
					})
				}

				if (proc.stderr) {
					stderrString = ''
					stdbothString = ''
					proc.stderr.on('data', chunk => {
						// const encoding = proc.stdout.readableEncoding
						const str = chunk.toString() // encoding === 'buffer' ? void 0 : encoding)
						stderrString += str
						stdbothString += str
					})
				}
			}

			if (!notAutoKill) {
				addProcess(proc)
			}

			proc
				.on('disconnect', () => {
					_reject('process.disconnect')
				})
				.on('close', (code, signal) => {
					if (!ignoreProcessExitCode && code) {
						_reject(`process.close(code=${code}, signal=${signal})`)
					} else {
						_resolve()
					}
				})
				.on('exit', (code, signal) => {
					if (!ignoreProcessExitCode && code) {
						_reject(`process.exit(code=${code}, signal=${signal})`)
					} else {
						_resolve()
					}
				})
				.on('message', (message) => {
					console.log(`process.message: ${message}`)
				})
				.on('error', err => {
					_reject(err)
				})

			if (proc.stdout) {
				lineByLine({
					input   : proc.stdout,
					maxDelay: 100,
					handler : line => {
						try {
							const lineTrim = line.trim()
							const error = !dontSearchErrors && _stdOutSearchError(lineTrim)
							if (!dontShowOutputs && _logFilter(lineTrim)) {
								line = correctLog(line)
								process.stdout.write(`${line}`)
							}
							if (error) {
								_reject(`ERROR DETECTED: ${error}`)
							}
						} catch (ex) {
							_reject(ex)
						}
					},
				})
			}

			if (proc.stderr) {
				lineByLine({
					input   : proc.stderr,
					maxDelay: 1000,
					handler : line => {
						try {
							const lineTrim = line.trim()
							const isError = !dontSearchErrors && _stdErrIsError(lineTrim)
							if (isError) {
								process.stdout.write(`STDERR: ${line}`)
								_reject(line)
								return
							}
							const error = isError == null
								? _stdOutSearchError(lineTrim)
								: null
							if (!dontShowOutputs && _logFilter(lineTrim)) {
								line = correctLog(line)
								process.stdout.write(`${line}`)
							}
							if (error) {
								_reject(`ERROR DETECTED: ${error}`)
							}
						} catch (ex) {
							_reject(ex)
						}
					},
				})
			}

			if (prepareProcess) {
				prepareProcess(proc)
			}
		}))()
	}).catch(err => {
		if (!wasKillAll()) {
			return Promise.reject(err)
		}
		return null
	})
}

export function run(command: string, options: IRunOptions = {}): Promise<IRunResult> {
	return withTimeout(command, options.timeout, () => _run(command, options))
}

(Promise.prototype as any).stopOnError = function stopOnError() {
	return this.catch(err => {
		printError('Kill on error', err)
		killAll({isFailure: true, syncKill: false})
	})
}

export const runOnce: typeof run = singleCall(run)
