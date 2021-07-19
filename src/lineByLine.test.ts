/* eslint-disable no-shadow */
import assert from 'assert'
import {run} from './run-func'
import {Transform, Writable} from 'stream'
import {lineByLine} from './lineByLine'

describe('lineByLine', function () {
	this.timeout(20000)

	function delay(milliseconds) {
		return new Promise(o => setTimeout(o, milliseconds))
	}

	it('run', async function () {
		let log = ''
		const stdout = new Writable({
			write(chunk: Buffer, encoding: BufferEncoding | 'buffer', callback: (error?: (Error | null)) => void) {
				log += chunk.toString(encoding === 'buffer' ? void 0 : encoding)
			},
		})

		const inoutStream = new Transform({
			transform(chunk, encoding, callback) {
				this.push(chunk);
				callback();
			},
		})

		const lines = []
		lineByLine({
			input   : inoutStream,
			maxDelay: 100,
			handler : line => {
				lines.push(line)
			}
		})

		assert.deepStrictEqual(lines, [])

		inoutStream.write('1')
		assert.deepStrictEqual(lines, [])

		inoutStream.write('\n')
		assert.deepStrictEqual(lines, ['1\n'])
		lines.length = 0

		inoutStream.write('\n\n\n')
		assert.deepStrictEqual(lines, ['\n', '\n', '\n'])
		lines.length = 0

		inoutStream.write('2\n3')
		assert.deepStrictEqual(lines, ['2\n'])
		lines.length = 0

		inoutStream.write('4\n5')
		assert.deepStrictEqual(lines, ['34\n'])
		lines.length = 0

		await delay(50)
		assert.deepStrictEqual(lines, [])

		await delay(300)
		assert.deepStrictEqual(lines, ['5'])
		lines.length = 0

		inoutStream.write('678')
		assert.deepStrictEqual(lines, [])
		inoutStream.end('9')

		await delay(1)

		assert.deepStrictEqual(lines, ['6789'])
	})
})
