/* eslint-disable no-shadow,global-require */
import assert from 'assert'
import colors from 'kleur'
const { removeColor } = require('./run-func')

describe('run', function () {
	this.timeout(20000)

	function delay(milliseconds) {
		return new Promise(o => setTimeout(o, milliseconds))
	}

	async function test(
		argv,
		script,
		transformScript,
		stdoutExpected,
	) {
		const command = `node -e "${transformScript}"`

		const process_stdout_write = process.stdout.write
		const process_stderr_write = process.stderr.write

		try {
			const stdout = []
			const stderr = []
			function assertOutput(_stdout, _stderr = []) {
				assert.deepStrictEqual(stderr, _stderr)
				assert.deepStrictEqual(stdout, _stdout)
				stderr.length = 0
				stdout.length = 0
			}
			process.stdout.write = function stdout_write_custom() {
				stdout.push(arguments[0].replace(/ *\([\d.]+ *sec\)/, ''))
				return process_stdout_write.apply(this, arguments)
			} as any
			process.stderr.write = function stderr_write_custom() {
				stderr.push(arguments[0])
				return process_stderr_write.apply(this, arguments)
			} as any

			console.log('test')
			assertOutput(['test\n'])

			process.argv = [...argv, script]
			delete require.cache[require.resolve('./run')]
			await require('./run')
			await delay(1000)
			assertOutput([
				colors.blue(`RUN: ${command}`) + '\n',
				...stdoutExpected,
				colors.cyan(`SUCCESS: ${command}`) + '\n',
			])

			// const result = await run(command, {
			// 	returnOutputs: true,
			// 	notAutoKill  : true,
			// })
			//
			// assert.deepStrictEqual(result, {
			// 	both: stdoutExpected.join(''),
			// 	err : '',
			// 	out : stdoutExpected.join(''),
			// })
		} finally {
			process.stdout.write = process_stdout_write
			process.stderr.write = process_stderr_write
		}
	}

	it('run with config', async function () {
		await test([
			'node', './index.js',
			'--config', '.run-script-rc.js',
		],
		`console.log('${colors.blue('123')}'); console.log('${colors.blue('234')}')`,
		`console.log('${colors.blue('123')}'); console.log('${colors.blue('234')}')`, [
			`${colors.blue('123')}\n`,
			`${colors.blue('234')}\n`,
		])
	})

	it('run with converter', async function () {
		await test([
			'node', './index.js',
			'--config', '.run-script-rc.js',
			'--transform', 'transform.js',
		],
		`console.log('${colors.blue('234')}'); console.log('${colors.blue('345')}')`,
		`console.log('${colors.blue('123')}'); console.log('${colors.blue('345')}')`, [
			`${colors.blue('123')}\n`,
			`${colors.blue('345')}\n`,
		])
	})
})
