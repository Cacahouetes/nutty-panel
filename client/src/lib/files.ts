import { ApiError, getTokens } from '@/lib/api'

export async function uploadFile(serverId: string, targetPath: string, file: File): Promise<void> {
  const tokens = getTokens()
  const form = new FormData()
  form.append('file', file)
  const url = `/api/servers/${serverId}/files/upload?path=${encodeURIComponent(targetPath)}`
  const response = await fetch(url, {
    method: 'POST',
    headers: tokens ? { Authorization: `Bearer ${tokens.accessToken}` } : {},
    body: form,
  })
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { message?: string } | null
    throw new ApiError(payload?.message ?? `Upload failed with ${response.status}`, response.status)
  }
}

export async function downloadFile(serverId: string, filePath: string): Promise<void> {
  const tokens = getTokens()
  const url = `/api/servers/${serverId}/files/download?path=${encodeURIComponent(filePath)}`
  const response = await fetch(url, {
    headers: tokens ? { Authorization: `Bearer ${tokens.accessToken}` } : {},
  })
  if (!response.ok) {
    throw new ApiError(`Download failed with ${response.status}`, response.status)
  }
  const blob = await response.blob()
  const objectUrl = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = objectUrl
  link.download = filePath.split('/').pop() ?? 'file'
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(objectUrl)
}

export function joinPath(base: string, name: string): string {
  return base ? `${base}/${name}` : name
}

export function formatBytes(bytes?: number): string {
  if (bytes === undefined) return ''
  if (bytes < 1024) return `${bytes} o`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`
  return `${(bytes / 1024 / 1024).toFixed(1)} Mo`
}