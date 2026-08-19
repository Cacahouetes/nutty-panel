export interface FileEntry {
  name: string
  path: string
  type: 'file' | 'directory'
  sizeBytes?: number
  modifiedAt?: Date
}

export interface ExecResult {
  exitCode: number
  stdout: Buffer
  stderr: Buffer
}

export interface ExecOptions {
  stdin?: NodeJS.ReadableStream | Buffer
}

export interface ServerExec {
  execCommand(serverId: string, cmd: string[], opts?: ExecOptions): Promise<ExecResult>
}

export interface ServerFileAccess {
  list(serverId: string, path: string): Promise<FileEntry[]>
  readText(serverId: string, path: string): Promise<string>
  writeText(serverId: string, path: string, content: string): Promise<void>
  createDirectory(serverId: string, path: string): Promise<void>
  remove(serverId: string, path: string): Promise<void>
  rename(serverId: string, from: string, to: string): Promise<void>
  upload(serverId: string, path: string, stream: NodeJS.ReadableStream): Promise<void>
  download(serverId: string, path: string): Promise<NodeJS.ReadableStream>
}

export const SERVER_FILE_ACCESS = Symbol('ServerFileAccess')
export const SERVER_EXEC = Symbol('ServerExec')
