#!/usr/bin/env node

import {GLOBAL_CONFIG_ENV} from './contracts'
/* eslint-disable global-require */
import {run} from './run-func'
import yargs from 'yargs'
import path from 'path'

module.exports = (async () => {
	const argv = await yargs(process.argv)
		.option('config', {
			alias      : 'c',
			type       : 'string',
			description: 'relative path to the run-script-rc.js file',
		})
		.option('transform', {
			alias      : 't',
			type       : 'string',
			description: 'path to the script that transform the input script',
		})
		.argv

	let script = (argv._[argv._.length - 1] || '').toString()
	if (argv.transform) {
		script = require(path.resolve('.', argv.transform))(script)
	}

	try {
		return await run(
			`node -e "${script.replace(/"/g, '""')}"`,
			{
				notAutoKill: true,
				stdin      : 'inherit',
				env        : {
					[GLOBAL_CONFIG_ENV]: argv.config || void 0,
				},
			},
		)
	} finally {
		delete process.env[GLOBAL_CONFIG_ENV]
	}
})()
