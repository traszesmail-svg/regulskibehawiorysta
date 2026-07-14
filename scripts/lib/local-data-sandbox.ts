import { mkdir, rm } from 'fs/promises'
import { tmpdir } from 'os'
import path from 'path'
import { getLocalStoreDataDir } from '../../lib/server/local-store-path'

type LocalDataSandbox = {
  dataDir: string
  cleanup: () => Promise<void>
}

export async function createLocalDataSandbox(scriptName: string, rootDir = process.cwd()): Promise<LocalDataSandbox> {
  const previousValue = process.env.APP_LOCAL_DATA_DIR
  const absoluteSandboxDir = path.join(
    tmpdir(),
    'regulski-behawiorysta-tests',
    `${scriptName}-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  )

  process.env.APP_LOCAL_DATA_DIR = absoluteSandboxDir

  const dataDir = getLocalStoreDataDir(rootDir)
  await rm(dataDir, { recursive: true, force: true })
  await mkdir(dataDir, { recursive: true })

  return {
    dataDir,
    cleanup: async () => {
      await rm(dataDir, { recursive: true, force: true })

      if (typeof previousValue === 'string') {
        process.env.APP_LOCAL_DATA_DIR = previousValue
      } else {
        delete process.env.APP_LOCAL_DATA_DIR
      }
    },
  }
}
