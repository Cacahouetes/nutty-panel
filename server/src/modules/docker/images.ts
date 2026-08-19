import type { ServerType } from '../servers/server-instance'

const JAVA_IMAGE = 'itzg/minecraft-server:latest'
const BEDROCK_IMAGE = 'itzg/minecraft-bedrock-server:latest'

const JAVA_TYPES: readonly ServerType[] = ['vanilla', 'paper', 'spigot', 'fabric', 'forge']

export function resolveImage(type: ServerType): string {
  return JAVA_TYPES.includes(type) ? JAVA_IMAGE : BEDROCK_IMAGE
}
