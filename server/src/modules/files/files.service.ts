import type { FileEntry, ServerFileAccess } from './server-file-access'

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'NotFoundError'
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ValidationError'
  }
}

export class BinaryFileError extends ValidationError {
  constructor(path: string) {
    super(`refusing to edit binary file: ${path}`)
    this.name = 'BinaryFileError'
  }
}

export class FileTooLargeError extends ValidationError {
  constructor(path: string, sizeBytes: number) {
    super(`file too large to edit as text: ${path} (${sizeBytes} bytes)`)
    this.name = 'FileTooLargeError'
  }
}

export const MAX_TEXT_BYTES = 1_000_000

export interface FilesServiceDeps {
  access: ServerFileAccess
}

export interface FilesService {
  list(serverId: string, path: string): Promise<FileEntry[]>
  readText(serverId: string, path: string): Promise<string>
  writeText(serverId: string, path: string, content: string): Promise<void>
  createDirectory(serverId: string, path: string): Promise<void>
  remove(serverId: string, path: string): Promise<void>
  rename(serverId: string, from: string, to: string): Promise<void>
  upload(serverId: string, path: string, stream: NodeJS.ReadableStream): Promise<void>
  download(serverId: string, path: string): Promise<NodeJS.ReadableStream>
}

export const FILES_SERVICE = Symbol('FilesService')

export function createFilesService(deps: FilesServiceDeps): FilesService {
  return new DefaultFilesService(deps)
}

class DefaultFilesService implements FilesService {
  constructor(private readonly deps: FilesServiceDeps) {}

  async list(serverId: string, path: string): Promise<FileEntry[]> {
    this.assertSafePath(path, { allowEmpty: true })
    return this.deps.access.list(serverId, path)
  }

  async readText(serverId: string, path: string): Promise<string> {
    this.assertSafePath(path)
    const content = await this.deps.access.readText(serverId, path)
    if (content.includes('\0')) {
      throw new BinaryFileError(path)
    }
    if (content.length > MAX_TEXT_BYTES) {
      throw new FileTooLargeError(path, content.length)
    }
    return content
  }

  async writeText(serverId: string, path: string, content: string): Promise<void> {
    this.assertSafePath(path)
    if (content.includes('\0')) {
      throw new BinaryFileError(path)
    }
    if (content.length > MAX_TEXT_BYTES) {
      throw new FileTooLargeError(path, content.length)
    }
    await this.deps.access.writeText(serverId, path, content)
  }

  async createDirectory(serverId: string, path: string): Promise<void> {
    this.assertSafePath(path)
    await this.deps.access.createDirectory(serverId, path)
  }

  async remove(serverId: string, path: string): Promise<void> {
    this.assertSafePath(path)
    await this.deps.access.remove(serverId, path)
  }

  async rename(serverId: string, from: string, to: string): Promise<void> {
    this.assertSafePath(from)
    this.assertSafePath(to)
    await this.deps.access.rename(serverId, from, to)
  }

  async upload(serverId: string, path: string, stream: NodeJS.ReadableStream): Promise<void> {
    this.assertSafePath(path)
    await this.deps.access.upload(serverId, path, stream)
  }

  async download(serverId: string, path: string): Promise<NodeJS.ReadableStream> {
    this.assertSafePath(path)
    return this.deps.access.download(serverId, path)
  }

  private assertSafePath(path: string, opts: { allowEmpty?: boolean } = {}): void {
    if (!path || !path.trim()) {
      if (opts.allowEmpty) {
        return
      }
      throw new ValidationError('path is required')
    }
    if (path.startsWith('/')) {
      throw new ValidationError('path must be relative')
    }
    if (path.split(/[\\/]/).includes('..')) {
      throw new ValidationError('path traversal is not allowed')
    }
  }
}
