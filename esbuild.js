const { build, context } = require('esbuild')

const baseConfig = (production) => {
    return {
        bundle: true,
        minify: production === true,
        sourcemap: production === false,
    }
}

const extensionConfig = (production) => {
    const cfg = baseConfig(production)
    return {
        ...cfg,
        platform: 'node',
        mainFields: ['module', 'main'],
        format: 'cjs',
        entryPoints: ['./src/extension.ts'],
        outfile: './out/extension.js',
        external: ['vscode'],
    }
}

const onEndPlugin = {
    name: 'on-end',
    setup(build) {
        build.onEnd((result) => {
            console.log(`build ended with ${result.errors.length} errors`)
            if (result.errors.length > 0) {
                result.errors.forEach((error) =>
                    console.error(
                        `> ${error.location.file}:${error.location.line}:${error.location.column}: error: ${error.text}`
                    )
                )
            }
        })
    },
}

;(async () => {
    try {
        const isProduction =
            process.argv.includes('--production') || process.argv.includes('-p')
        const extConfig = extensionConfig(isProduction)
        if (process.argv.includes('--watch')) {
            // Watch source code
            const ctx = await context({
                ...extConfig,
                plugins: [onEndPlugin],
            })

            await ctx.watch()
        } else {
            await build(extConfig)
            console.log('extension build complete')
        }
    } catch (err) {
        process.stderr.write(err.stderr)
        process.exit(1)
    }
})().catch(console.error)
