import Docker from 'dockerode'
import type { ContainerManager } from './container.manager'
import type { ContainerSpec, ContainerState } from './container'

export class DockerContainerManager implements ContainerManager {
  constructor(private readonly docker: Docker = new Docker()) {}

  async create(spec: ContainerSpec): Promise<string> {
    const port = spec.ports[0]
    const hostConfig: Docker.HostConfig = {
      NanoCpus: Math.max(1, Math.round((spec.resources.cpuPercent / 100) * 1e9)),
      Memory: spec.resources.memoryMb * 1024 * 1024,
      MemorySwap: spec.resources.memoryMb * 1024 * 1024,
      Binds: [`${spec.volumeName}:${spec.mountPath}`],
      RestartPolicy: { Name: 'no' },
    }
    if (spec.resources.diskMb !== undefined) {
      hostConfig.StorageOpt = { size: `${spec.resources.diskMb}M` }
    }
    if (port) {
      hostConfig.PortBindings = {
        [`${port.containerPort}/tcp`]: [{ HostPort: String(port.hostPort) }],
      }
    }
    const container = await this.docker.createContainer({
      name: spec.name,
      Image: spec.image,
      Env: Object.entries(spec.env).map(([key, value]) => `${key}=${value}`),
      ExposedPorts: port ? { [`${port.containerPort}/tcp`]: {} } : undefined,
      Cmd: spec.cmd,
      HostConfig: hostConfig,
    })
    return container.id
  }

  async start(containerId: string): Promise<void> {
    await this.docker.getContainer(containerId).start()
  }

  async stop(containerId: string): Promise<void> {
    await this.docker.getContainer(containerId).stop({ t: 30 })
  }

  async kill(containerId: string): Promise<void> {
    await this.docker.getContainer(containerId).kill()
  }

  async restart(containerId: string): Promise<void> {
    await this.docker.getContainer(containerId).restart({ t: 30 })
  }

  async remove(containerId: string): Promise<void> {
    await this.docker.getContainer(containerId).remove({ force: true, v: true })
  }

  async inspect(containerId: string): Promise<ContainerState> {
    const info = await this.docker.getContainer(containerId).inspect()
    return mapDockerState(info.State.Status)
  }

  async logs(containerId: string, tail = 100): Promise<string[]> {
    const buffer = await this.docker
      .getContainer(containerId)
      .logs({ stdout: true, stderr: true, tail })
    const text = demuxLogBuffer(buffer)
    return text.split(/\r?\n/).filter((line) => line.length > 0)
  }

  async export(containerId: string): Promise<NodeJS.ReadableStream> {
    return this.docker.getContainer(containerId).export()
  }

  async putArchive(
    containerId: string,
    stream: NodeJS.ReadableStream,
    path: string,
  ): Promise<void> {
    await this.docker.getContainer(containerId).putArchive(stream, { path })
  }
}

function mapDockerState(status: string): ContainerState {
  switch (status) {
    case 'created':
      return 'created'
    case 'running':
    case 'restarting':
      return 'running'
    default:
      return 'stopped'
  }
}

function demuxLogBuffer(buffer: Buffer): string {
  const chunks: Buffer[] = []
  let offset = 0
  while (offset + 8 <= buffer.length) {
    const size = buffer.readUInt32BE(offset + 4)
    const end = offset + 8 + size
    if (end > buffer.length) break
    chunks.push(buffer.subarray(offset + 8, end))
    offset = end
  }
  if (offset < buffer.length) {
    chunks.push(buffer.subarray(offset))
  }
  return Buffer.concat(chunks).toString('utf8')
}
