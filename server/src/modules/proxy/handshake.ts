export class IncompleteHandshakeError extends Error {
  constructor(message = 'handshake packet is incomplete') {
    super(message)
    this.name = 'IncompleteHandshakeError'
  }
}

export class InvalidHandshakeError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'InvalidHandshakeError'
  }
}

export interface HandshakeResult {
  protocolVersion: number
  serverAddress: string
  serverPort: number
  nextState: number
  consumed: number
}

export function writeVarInt(value: number): Buffer {
  const bytes: number[] = []
  let remaining = value
  do {
    let current = remaining & 0x7f
    remaining >>>= 7
    if (remaining > 0) {
      current |= 0x80
    }
    bytes.push(current)
  } while (remaining > 0)
  return Buffer.from(bytes)
}

export function readVarInt(data: Buffer, offset: number): { value: number; bytes: number } {
  let value = 0
  for (let i = 0; i < 5; i++) {
    const byte = data[offset + i]
    if (byte === undefined) {
      throw new IncompleteHandshakeError('varint is truncated')
    }
    value |= (byte & 0x7f) << (7 * i)
    if ((byte & 0x80) === 0) {
      return { value: value >>> 0, bytes: i + 1 }
    }
  }
  throw new InvalidHandshakeError('varint exceeds 5 bytes')
}

export function parseMinecraftHandshake(data: Buffer): HandshakeResult {
  if (data.length === 0) {
    throw new IncompleteHandshakeError('empty buffer')
  }
  const length = readVarInt(data, 0)
  const packetEnd = length.bytes + length.value
  if (data.length < packetEnd) {
    throw new IncompleteHandshakeError('packet payload is incomplete')
  }

  let offset = length.bytes
  const packetId = data[offset]
  if (packetId !== 0x00) {
    throw new InvalidHandshakeError(`unexpected packet id 0x${packetId.toString(16)}`)
  }
  offset++

  const protocolVersion = readVarInt(data, offset)
  offset += protocolVersion.bytes

  const addressLength = readVarInt(data, offset)
  offset += addressLength.bytes
  if (data.length < offset + addressLength.value) {
    throw new IncompleteHandshakeError('server address is truncated')
  }
  const serverAddress = data.subarray(offset, offset + addressLength.value).toString('utf8')
  offset += addressLength.value

  if (data.length < offset + 2) {
    throw new IncompleteHandshakeError('server port is truncated')
  }
  const serverPort = data.readUInt16BE(offset)
  offset += 2

  const nextState = readVarInt(data, offset)
  offset += nextState.bytes

  return {
    protocolVersion: protocolVersion.value,
    serverAddress,
    serverPort,
    nextState: nextState.value,
    consumed: offset,
  }
}
