/* eslint-disable no-shadow */
import assert from 'assert'
import {run} from './helpers'
import {Writable} from 'stream'

describe('helpers', function () {
	this.timeout(20000)

	it('run', async function () {
		let log = ''
		const stdout = new Writable({
			write(chunk: Buffer, encoding: BufferEncoding | 'buffer', callback: (error?: (Error | null)) => void) {
				log += chunk.toString(encoding === 'buffer' ? void 0 : encoding)
			},
		})
		const result = await run('echo 123', {
			returnOutputs: true,
			prepareProcess(proc) {
				proc.stdout.pipe(stdout)
			},
		})
		assert.strictEqual(result.out.trim(), '123')
		assert.strictEqual(result.both.trim(), '123')
		assert.strictEqual(result.err.trim(), '')
		assert.strictEqual(log.trim(), '123')
	})
})
