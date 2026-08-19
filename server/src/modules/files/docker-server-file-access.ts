import { Readable } from 'node:stream'
import { CONTAINER_MOUNT_PATH } from '../docker/container'
import { NotFoundError } from './files.service'
import type { FileEntry, ServerExec } from './server-file-access'
import type { ServerFileAccess } from './server-file-access'
import { ExecFailedError } from '../docker/docker.container.manager'

export interface DockerServerFileAccessDeps {
  exec: ServerExec
}

export class DockerServerFileAccess implements ServerFileAccess {
  constructor(private readonly deps: DockerServerFileAccessDeps) {}

  async list(serverId: string, path: string): Promise<FileEntry[]> {
    const target = this.toFsPath(path)
    const result = await this.run(serverId, [
      'sh',
      '-c',
      `find ${quote(target)} -maxdepth 1 -mindepth 1 -printf '%y\\t%s\\t%T@\\t%f\\n' | sort`,
    ])
    return parseListOutput(result.stdout.toString('utf8'), path)
  }

  async readText(serverId: string, path: string): Promise<string> {
    const result = await this.run(serverId, ['cat', this.toFsPath(path)])
    return result.stdout.toString('utf8')
  }

  async writeText(serverId: string, path: string, content: string): Promise<void> {
    await this.run(serverId, ['sh', '-c', `cat > ${quote(this.toFsPath(path))}`], {
      stdin: Buffer.from(content, 'utf8'),
    })
  }

  async createDirectory(serverId: string, path: string): Promise<void> {
    await this.run(serverId, ['mkdir', '-p', this.toFsPath(path)])
  }

  async remove(serverId: string, path: string): Promise<void> {
    await this.run(serverId, ['rm', '-rf', this.toFsPath(path)])
  }

  async rename(serverId: string, from: string, to: string): Promise<void> {
    await this.run(serverId, ['mv', this.toFsPath(from), this.toFsPath(to)])
  }

  async upload(serverId: string, path: string, stream: NodeJS.ReadableStream): Promise<void> {
    await this.run(serverId, ['sh', '-c', `cat > ${quote(this.toFsPath(path))}`], {
      stdin: stream,
    })
  }

  async download(serverId: string, path: string): Promise<NodeJS.ReadableStream> {
    const result = await this.run(serverId, ['cat', this.toFsPath(path)])
    return Readable.from([result.stdout])
  }

  private async run(
    serverId: string,
    cmd: string[],
    opts?: { stdin?: NodeJS.ReadableStream | Buffer },
  ): Promise<{ stdout: Buffer }> {
    try {
      return await this.deps.exec.execCommand(serverId, cmd, opts)
    } catch (err) {
      if (err instanceof ExecFailedError) {
        throw new NotFoundError(err.message)
      }
      throw err
    }
  }

  private toFsPath(path: string): string {
    return path ? `${CONTAINER_MOUNT_PATH}/${path}` : CONTAINER_MOUNT_PATH
  }
}

function quote(path: string): string {
  return `'${path.replace(/'/g, `'\\''`)}'`
}

function parseListOutput(output: string, basePath: string): FileEntry[] {
  const entries: FileEntry[] = []
  for (const line of output.split(/\r?\n/)) {
    if (!line) continue
    const parts = line.split('\t')
    if (parts.length < 4) continue
    const [typeChar, size, mtime, ...nameParts] = parts
    const name = nameParts.join('\t')
    if (!name) continue
    const isDirectory = typeChar === 'd'
    entries.push({
      name,
      path: basePath ? `${basePath}/${name}` : name,
      type: isDirectory ? 'directory' : 'file',
      sizeBytes: isDirectory ? undefined : Number(size),
      modifiedAt: new Date(Number(mtime) * 1000),
    })
  }
  return entries
}
