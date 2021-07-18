function appendLine(
	buffer: string[],
	firstLine: boolean,
	str: string,
	prevIndex: number,
	newIndex: number,
) {
	const line = str.substring(prevIndex, newIndex)
	if (firstLine && buffer.length > 0) {
		buffer[buffer.length - 1] += line
	} else {
		buffer.push(line)
	}
}

export function lineByLine({
	input,
	maxDelay = 100,
	handler,
}: {
	input: NodeJS.ReadableStream,
	maxDelay?: number,
	handler: (line: string) => void,
}) {
	let lastDataTime = 0
	const timer = maxDelay
		? setInterval(() => {
			if (Date.now() - lastDataTime >= maxDelay) {
				emitLines(true)
			}
		}, 10)
		: null

	const buffer = []
	function onData(chunk) {
		const str = chunk.toString()
		let prevIndex = 0
		let firstLine = true
		const len = str.length
		for (let i = 0; i < len; i++) {
			const ch = str.charCodeAt(i)
			if (ch === 10) {
				const newIndex = i + 1
				appendLine(buffer, firstLine, str, prevIndex, newIndex)
				prevIndex = newIndex
				firstLine = false
			}
		}

		if (prevIndex < len) {
			appendLine(buffer, firstLine, str, prevIndex, len)
		}

		emitLines(false)

		lastDataTime = Date.now()
	}

	function emitLines(includingIncompleteLine: boolean) {
		const len = buffer.length

		for (let i = 0, len = buffer.length - 1; i < len; i++) {
			const line = buffer[i]
			handler(line)
		}

		if (buffer.length > 0) {
			const line = buffer[buffer.length - 1]
			if (includingIncompleteLine || line.endsWith('\n')) {
				handler(line)
				buffer.length = 0
			} else {
				buffer[0] = buffer[buffer.length - 1]
				buffer.length = 1
			}
		}
	}

	input.on('data', onData)
	input.on('end', unsubscribe)
	input.on('finish', unsubscribe)

	let unsubscribed
	function unsubscribe() {
		if (unsubscribed) {
			return
		}

		if (timer) {
			clearInterval(timer)
		}
		input.removeListener('data', onData)
		input.removeListener('end', unsubscribe)
		input.removeListener('finish', unsubscribe)
		emitLines(true)

		unsubscribed = true
	}

	return unsubscribe
}
