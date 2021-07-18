<!-- Markdown Docs: -->
<!-- https://guides.github.com/features/mastering-markdown/#GitHub-flavored-markdown -->
<!-- https://daringfireball.net/projects/markdown/basics -->
<!-- https://daringfireball.net/projects/markdown/syntax -->

<!-- [![NPM Version][npm-image]][npm-url] -->
<!-- [![NPM Downloads][downloads-image]][downloads-url] -->
<!-- [![Node.js Version][node-version-image]][node-version-url] -->
[![Build Status][github-actions-badge]][github-actions-url]

# Description

## Run

```sh
run-script "console.log(123)"
```

```sh
run-script --config .run-script-rc.js "console.log(123)"
```

```sh
run-script "require(./scripts.js).run({ option1: true, option2: true })"
```

## Script helpers

```ts
const {run, singleCall, singleProcess} = require('../helpers/helpers')

// singleCall - Create function that skip all executions except first
const buildMjs = singleCall(() => {
    // run - execute command line
	const {out, err, both} = await run(`babel src -x .js -x .ts`, {
        // see: IRunOptions
        returnOutputs: true,
    })
})

// singleProcess - Create function that wait unlit previous execution is completed before the next one
const build = singleProcess(async appConfigType => {
	await Promise.all([
		common.build(),
		buildMjs(appConfigType),
		buildJs(appConfigType),
	])
})

export interface IRunOptions {
	env?: ProcessEnv,
	cwd? : string,
	timeout?: number,
	notAutoKill?: boolean, // don't auto kill all process tree after error
	stdin?: undefined | null | 'pipe' | 'ipc' | 'ignore' | 'inherit' | Stream,
	shell?: boolean,
	prepareProcess?: (proc: ChildProcess) => void,
	dontSearchErrors?: boolean,
	dontShowOutputs?: boolean,
    returnOutputs?: boolean,
}
```

[See examples here](./env/scripts)

## Config

Default config path is `./.run-script-rc.js`

Config type:
```ts
type TextPredicate = (text: string, next: TextPredicate) => boolean
type ErrorSearch = (text: string, next: ErrorSearch) => string | void | null | false

type IGlobalConfig = {
	logFilter?: TextPredicate,
	stdOutSearchError?: ErrorSearch,
	stdErrIsError?: TextPredicate,
}
```

[See the config example here](./.run-config-rc.js)

# License

[CC0-1.0](LICENSE)

[npm-image]: https://img.shields.io/npm/v/run-script.svg
[npm-url]: https://npmjs.org/package/run-script
[node-version-image]: https://img.shields.io/node/v/run-script.svg
[node-version-url]: https://nodejs.org/en/download/
[github-actions-badge]: https://github.com/NikolayMakhonin/run-script/actions/workflows/build.yml/badge.svg
[github-actions-url]: https://github.com/NikolayMakhonin/run-script/actions
[downloads-image]: https://img.shields.io/npm/dm/run-script.svg
[downloads-url]: https://npmjs.org/package/run-script
[npm-url]: https://npmjs.org/package/run-script
