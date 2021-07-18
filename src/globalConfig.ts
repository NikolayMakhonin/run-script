/* eslint-disable global-require */
import fs from 'fs'
import path from 'path'
import {IGlobalConfig, GLOBAL_CONFIG_ENV} from './contracts'

let globalConfig: IGlobalConfig = {}

export function getGlobalConfig(): IGlobalConfig {
	loadGlobalConfig()
	return globalConfig
}
export function setGlobalConfig(config: IGlobalConfig) {
	globalConfig = config
}

// region load config

let globalConfigLoaded = false

function loadGlobalConfig() {
	if (globalConfigLoaded) {
		return
	}
	globalConfigLoaded = true

	const configFile = path.resolve(process.cwd(), process.env[GLOBAL_CONFIG_ENV] || '.run-script-rc.js')

	if (fs.existsSync(configFile)) {
		const config = require(configFile)
		setGlobalConfig({
			...getGlobalConfig(),
			...config,
		})
	} else if (process.env[GLOBAL_CONFIG_ENV]) {
		throw new Error('Config file not found: ' + configFile)
	}
}

// endregion
