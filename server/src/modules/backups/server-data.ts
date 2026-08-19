export interface ServerDataAccess {
  exportData(serverId: string): Promise<NodeJS.ReadableStream>
  importData(serverId: string, stream: NodeJS.ReadableStream): Promise<void>
}

export const SERVER_DATA_ACCESS = Symbol('ServerDataAccess')
