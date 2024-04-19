import {
    ExtensionContext,
    authentication,
    commands,
    window,
    workspace,
    Uri,
} from 'vscode'
import md5 from 'md5'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { Readable } from 'stream'
import { finished } from 'stream/promises'

enum SourceType {
    ghRelease = 'gh-release',
}

type GhReleaseSource = {
    type: SourceType.ghRelease
    /** owner/repo */
    repository: string
}

type Source = GhReleaseSource

type SourceWithHash = Source & { hash: string }

type GhReleaseSourceInfo = {
    assetUrl: string
    version: string
    repository: string
}

type InstallationInfo = {
    sourceHash: string
    versionHash: string
}

const SCOPES = ['read:user', 'user:email', 'repo', 'read:org']

async function getGhToken(): Promise<string> {
    const session = await authentication.getSession('github', SCOPES, {
        createIfNone: true,
    })
    return session.accessToken
}

async function fetchGhReleaseSource(
    source: GhReleaseSource,
    token: string
): Promise<GhReleaseSourceInfo | undefined> {
    const result = await fetch(
        'https://api.github.com/repos/' +
            source.repository +
            '/releases/latest',
        {
            headers: {
                /* eslint-disable @typescript-eslint/naming-convention */
                Accept: 'application/vnd.github.v3+json',
                Authorization: 'Bearer ' + token,
                'X-GitHub-Api-Version': '2022-11-28',
                /* eslint-enable @typescript-eslint/naming-convention */
            },
        }
    )
    const json: any = await result.json()
    console.log(json)
    const vsix = json.assets.find((asset: any) => asset.name.endsWith('.vsix'))
    if (!vsix) {
        return
    }

    return {
        assetUrl: vsix.url,
        version: String(vsix.id),
        repository: source.repository,
    }
}

async function downloadGhReleaseVsix(
    info: GhReleaseSourceInfo,
    token: string
): Promise<string | undefined> {
    const result = await fetch(info.assetUrl, {
        headers: {
            /* eslint-disable @typescript-eslint/naming-convention */
            Accept: 'application/octet-stream',
            Authorization: 'Bearer ' + token,
            'X-GitHub-Api-Version': '2022-11-28',
            /* eslint-enable @typescript-eslint/naming-convention */
        },
    })
    const fileName = info.repository.replace('/', '-') + '.vsix'
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dvm-'))
    const filePath = path.join(tempDir, fileName)
    const fileStream = fs.createWriteStream(filePath, { flags: 'wx' })

    if (result.body === null || result.status === 404) {
        return undefined
    }
    await finished(Readable.fromWeb(result.body).pipe(fileStream))
    return filePath
}

function isInstalled(
    installed: InstallationInfo[],
    source: SourceWithHash,
    versionHash: string
) {
    return installed.some(
        (info) =>
            info.sourceHash === source.hash && info.versionHash === versionHash
    )
}

export async function activate(context: ExtensionContext) {
    console.log(
        'Congratulations, your extension "distributed-package-manager" is now active!'
    )

    const sources = workspace
        .getConfiguration('distributed-package-manager')
        .get<Source[]>('sources', [])

    const sourceHashes: SourceWithHash[] = sources.map((source) => {
        return { ...source, hash: md5(JSON.stringify(source)) }
    })
    let installed = context.globalState.get<InstallationInfo[]>(
        'installedSources',
        []
    )

    const token = await getGhToken()
    const promises = sourceHashes.map(async (source) => {
        switch (source.type) {
            case SourceType.ghRelease:
                const releaseInfo = await fetchGhReleaseSource(source, token)
                if (!releaseInfo) {
                    return
                }
                const versionHash = md5(JSON.stringify(releaseInfo))
                if (isInstalled(installed, source, versionHash)) {
                    return
                }
                const filePath = await downloadGhReleaseVsix(releaseInfo, token)
                return { filePath, versionHash, ...source }
            default:
                return
        }
    })

    const results = await Promise.all(promises)
    results.forEach(async (result) => {
        if (!result) {
            return
        }
        if (!result.filePath) {
            window.showErrorMessage(
                'Failed to download extension - ' + result.repository
            )
            return
        }
        const x = await commands.executeCommand(
            'workbench.extensions.installExtension',
            Uri.file(result.filePath)
        )
        console.log(x)
        //update installed
        const newInstalled = installed.filter(
            (info) => info.sourceHash !== result.hash
        )
        newInstalled.push({
            sourceHash: result.hash,
            versionHash: result.versionHash,
        })
        installed = newInstalled
        context.globalState.update('installedSources', installed)
    })
}

export function deactivate() {}
