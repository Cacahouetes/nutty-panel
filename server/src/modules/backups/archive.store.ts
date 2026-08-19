export interface StoredArchive {
  key: string
  sizeBytes: number
}

export interface ArchiveStore {
  saveArchive(serverId: string, source: NodeJS.ReadableStream): Promise<StoredArchive>
  openArchive(key: string): Promise<NodeJS.ReadableStream>
  deleteArchive(key: string): Promise<void>
}

export const ARCHIVE_STORE = Symbol('ArchiveStore')
