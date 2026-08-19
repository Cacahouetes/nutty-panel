import { describe, it, expect } from '@jest/globals'
import { Readable } from 'node:stream'
import {
  BinaryFileError,
  FileTooLargeError,
  NotFoundError,
  ValidationError,
  createFilesService,
  type FilesService,
} from './files.service'
import type { FileEntry, ServerFileAccess } from './server-file-access'

class FakeFileAccess implements ServerFileAccess {
  listCalls: { serverId: string; path: string }[] = []
  readCalls: { serverId: string; path: string }[] = []
  writeCalls: { serverId: string; path: string; content: string }[] = []
  mkdirCalls: { serverId: string; path: string }[] = []
  removeCalls: { serverId: string; path: string }[] = []
  renameCalls: { serverId: string; from: string; to: string }[] = []
  uploadCalls: { serverId: string; path: string }[] = []
  downloadCalls: { serverId: string; path: string }[] = []
  files: Map<string, string> = new Map([
    ['server-1/world/server.properties', 'motd=Hello'],
    ['server-1/binary.dat', 'abc\0def'],
    ['server-1/big.txt', 'x'.repeat(2_000_000)],
  ])

  async list(serverId: string, path: string): Promise<FileEntry[]> {
    this.listCalls.push({ serverId, path })
    return [
      { name: 'world', path: 'world', type: 'directory' },
      { name: 'server.properties', path: 'server.properties', type: 'file', sizeBytes: 10 },
    ]
  }

  async readText(serverId: string, path: string): Promise<string> {
    this.readCalls.push({ serverId, path })
    const key = `${serverId}/${path}`
    const content = this.files.get(key)
    if (content === undefined) {
      throw new NotFoundError(`file not found: ${path}`)
    }
    return content
  }

  async writeText(serverId: string, path: string, content: string): Promise<void> {
    this.writeCalls.push({ serverId, path, content })
    this.files.set(`${serverId}/${path}`, content)
  }

  async createDirectory(serverId: string, path: string): Promise<void> {
    this.mkdirCalls.push({ serverId, path })
  }

  async remove(serverId: string, path: string): Promise<void> {
    this.removeCalls.push({ serverId, path })
  }

  async rename(serverId: string, from: string, to: string): Promise<void> {
    this.renameCalls.push({ serverId, from, to })
  }

  async upload(serverId: string, path: string): Promise<void> {
    this.uploadCalls.push({ serverId, path })
  }

  async download(serverId: string, path: string): Promise<NodeJS.ReadableStream> {
    this.downloadCalls.push({ serverId, path })
    return Readable.from(['content'])
  }
}

function build(): { service: FilesService; access: FakeFileAccess } {
  const access = new FakeFileAccess()
  const service = createFilesService({ access })
  return { service, access }
}

describe('FilesService', () => {
  it('lists files of a server directory', async () => {
    const { service, access } = build()

    const entries = await service.list('server-1', 'world')

    expect(access.listCalls).toEqual([{ serverId: 'server-1', path: 'world' }])
    expect(entries[0]).toMatchObject({ name: 'world', type: 'directory' })
  })

  it('lists the root directory with an empty path', async () => {
    const { service, access } = build()
    await service.list('server-1', '')
    expect(access.listCalls).toEqual([{ serverId: 'server-1', path: '' }])
  })

  it('reads text files', async () => {
    const { service } = build()
    expect(await service.readText('server-1', 'world/server.properties')).toBe('motd=Hello')
  })

  it('rejects reading binary files', async () => {
    const { service } = build()
    await expect(service.readText('server-1', 'binary.dat')).rejects.toBeInstanceOf(BinaryFileError)
  })

  it('rejects reading files larger than the text limit', async () => {
    const { service } = build()
    await expect(service.readText('server-1', 'big.txt')).rejects.toBeInstanceOf(FileTooLargeError)
  })

  it('writes text files', async () => {
    const { service, access } = build()

    await service.writeText('server-1', 'world/server.properties', 'motd=New')

    expect(access.writeCalls).toEqual([
      { serverId: 'server-1', path: 'world/server.properties', content: 'motd=New' },
    ])
  })

  it('rejects writing binary content', async () => {
    const { service } = build()
    await expect(service.writeText('server-1', 'a.txt', 'x\0y')).rejects.toBeInstanceOf(
      BinaryFileError,
    )
  })

  it('creates a directory', async () => {
    const { service, access } = build()
    await service.createDirectory('server-1', 'plugins')
    expect(access.mkdirCalls).toEqual([{ serverId: 'server-1', path: 'plugins' }])
  })

  it('removes a file or directory', async () => {
    const { service, access } = build()
    await service.remove('server-1', 'world')
    expect(access.removeCalls).toEqual([{ serverId: 'server-1', path: 'world' }])
  })

  it('renames a file or directory', async () => {
    const { service, access } = build()
    await service.rename('server-1', 'old.txt', 'new.txt')
    expect(access.renameCalls).toEqual([{ serverId: 'server-1', from: 'old.txt', to: 'new.txt' }])
  })

  it('uploads a stream to a file path', async () => {
    const { service, access } = build()
    await service.upload('server-1', 'plugins.jar', Readable.from(['binary']))
    expect(access.uploadCalls).toEqual([{ serverId: 'server-1', path: 'plugins.jar' }])
  })

  it('downloads a file stream', async () => {
    const { service, access } = build()
    await service.download('server-1', 'server.properties')
    expect(access.downloadCalls).toEqual([{ serverId: 'server-1', path: 'server.properties' }])
  })

  it('rejects absolute paths', async () => {
    const { service } = build()
    await expect(service.list('server-1', '/etc')).rejects.toBeInstanceOf(ValidationError)
  })

  it('rejects path traversal', async () => {
    const { service } = build()
    await expect(service.readText('server-1', '../secret')).rejects.toBeInstanceOf(ValidationError)
    await expect(service.writeText('server-1', 'a/../../b', 'x')).rejects.toBeInstanceOf(
      ValidationError,
    )
  })

  it('rejects empty paths', async () => {
    const { service } = build()
    await expect(service.readText('server-1', ' ')).rejects.toBeInstanceOf(ValidationError)
  })
})
