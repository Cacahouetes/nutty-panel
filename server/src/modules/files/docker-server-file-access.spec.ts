import { describe, it, expect } from '@jest/globals'
import { Readable } from 'node:stream'
import { ExecFailedError } from '../docker/docker.container.manager'
import { NotFoundError } from './files.service'
import { DockerServerFileAccess } from './docker-server-file-access'
import type { ExecOptions, ExecResult, ServerExec } from './server-file-access'

class FakeServerExec implements ServerExec {
  calls: { serverId: string; cmd: string[]; stdin?: Buffer | NodeJS.ReadableStream }[] = []
  private results: ExecResult[] = []

  queueResult(result: ExecResult): void {
    this.results.push(result)
  }

  async execCommand(serverId: string, cmd: string[], opts?: ExecOptions): Promise<ExecResult> {
    this.calls.push({ serverId, cmd, stdin: opts?.stdin })
    const next = this.results.shift()
    if (next) {
      return next
    }
    return { exitCode: 0, stdout: Buffer.from(''), stderr: Buffer.from('') }
  }
}

function collect(stream: NodeJS.ReadableStream): Promise<Buffer> {
  const chunks: Buffer[] = []
  return new Promise((resolve, reject) => {
    stream.on('data', (chunk: Buffer) => chunks.push(chunk))
    stream.on('end', () => resolve(Buffer.concat(chunks)))
    stream.on('error', reject)
  })
}

describe('DockerServerFileAccess', () => {
  function build() {
    const exec = new FakeServerExec()
    const access = new DockerServerFileAccess({ exec })
    return { exec, access }
  }

  it('lists directory entries and parses find output', async () => {
    const { exec, access } = build()
    exec.queueResult({
      exitCode: 0,
      stdout: Buffer.from(
        'd\t0\t1700000000\tworld\nd\t0\t1700000001\tplugins\nf\t12\t1700000002\tserver.properties\n',
      ),
      stderr: Buffer.from(''),
    })

    const entries = await access.list('server-1', 'world')

    expect(exec.calls[0].cmd[0]).toBe('sh')
    expect(exec.calls[0].cmd[2]).toContain("find '/data/world'")
    expect(entries).toEqual([
      {
        name: 'world',
        path: 'world/world',
        type: 'directory',
        modifiedAt: new Date(1700000000 * 1000),
      },
      {
        name: 'plugins',
        path: 'world/plugins',
        type: 'directory',
        modifiedAt: new Date(1700000001 * 1000),
      },
      {
        name: 'server.properties',
        path: 'world/server.properties',
        type: 'file',
        sizeBytes: 12,
        modifiedAt: new Date(1700000002 * 1000),
      },
    ])
  })

  it('lists the root when path is empty', async () => {
    const { exec, access } = build()

    await access.list('server-1', '')

    expect(exec.calls[0].cmd[2]).toContain("find '/data'")
  })

  it('maps exec failures to NotFoundError when listing', async () => {
    const { exec, access } = build()
    jest
      .spyOn(exec, 'execCommand')
      .mockRejectedValueOnce(
        new ExecFailedError('find: /data/missing: No such file or directory', 1),
      )

    await expect(access.list('server-1', 'missing')).rejects.toBeInstanceOf(NotFoundError)
  })

  it('reads a text file with cat', async () => {
    const { exec, access } = build()
    exec.queueResult({
      exitCode: 0,
      stdout: Buffer.from('motd=Hello\n'),
      stderr: Buffer.from(''),
    })

    const content = await access.readText('server-1', 'server.properties')

    expect(exec.calls[0].cmd).toEqual(['cat', '/data/server.properties'])
    expect(content).toBe('motd=Hello\n')
  })

  it('writes text content through stdin', async () => {
    const { exec, access } = build()

    await access.writeText('server-1', 'server.properties', 'motd=New')

    expect(exec.calls[0].cmd).toEqual(['sh', '-c', "cat > '/data/server.properties'"])
    expect((exec.calls[0].stdin as Buffer).toString('utf8')).toBe('motd=New')
  })

  it('escapes single quotes in shell command paths', async () => {
    const { exec, access } = build()

    await access.writeText('server-1', "a'b.txt", 'x')

    expect(exec.calls[0].cmd[2]).toBe("cat > '/data/a'\\''b.txt'")
  })

  it('creates, removes and renames through simple argv commands', async () => {
    const { exec, access } = build()

    await access.createDirectory('server-1', 'plugins')
    await access.remove('server-1', 'world')
    await access.rename('server-1', 'old.txt', 'new.txt')

    expect(exec.calls[0].cmd).toEqual(['mkdir', '-p', '/data/plugins'])
    expect(exec.calls[1].cmd).toEqual(['rm', '-rf', '/data/world'])
    expect(exec.calls[2].cmd).toEqual(['mv', '/data/old.txt', '/data/new.txt'])
  })

  it('uploads a stream to a file path', async () => {
    const { exec, access } = build()
    const stream = Readable.from(['payload'])

    await access.upload('server-1', 'mods.jar', stream)

    expect(exec.calls[0].cmd).toEqual(['sh', '-c', "cat > '/data/mods.jar'"])
    expect(exec.calls[0].stdin).toBe(stream)
  })

  it('downloads a file as a readable stream', async () => {
    const { exec, access } = build()
    exec.queueResult({
      exitCode: 0,
      stdout: Buffer.from('binary-data'),
      stderr: Buffer.from(''),
    })

    const stream = await access.download('server-1', 'server.properties')

    expect(exec.calls[0].cmd).toEqual(['cat', '/data/server.properties'])
    expect((await collect(stream)).toString()).toBe('binary-data')
  })

  it('rethrows unknown errors', async () => {
    const { exec, access } = build()
    jest.spyOn(exec, 'execCommand').mockRejectedValueOnce(new Error('docker down'))

    await expect(access.readText('server-1', 'a.txt')).rejects.toThrow('docker down')
  })
})
