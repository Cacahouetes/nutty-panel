import { describe, it, expect } from '@jest/globals'
import {
  IncompleteHandshakeError,
  InvalidHandshakeError,
  parseMinecraftHandshake,
  readVarInt,
} from './handshake'

function encodeVarInt(value: number): number[] {
  const bytes: number[] = []
  let remaining = value
  while (true) {
    const byte = remaining & 0x7f
    remaining >>>= 7
    if (remaining === 0) {
      bytes.push(byte)
      break
    }
    bytes.push(byte | 0x80)
  }
  return bytes
}

function handshakeBytes(input: {
  protocolVersion: number
  serverAddress: string
  serverPort: number
  nextState: number
}): Buffer {
  const addressBytes = Buffer.from(input.serverAddress, 'utf8')
  const packet = Buffer.concat([
    Buffer.from([0x00]),
    Buffer.from(encodeVarInt(input.protocolVersion)),
    Buffer.from(encodeVarInt(addressBytes.length)),
    addressBytes,
    Buffer.from([(input.serverPort >> 8) & 0xff, input.serverPort & 0xff]),
    Buffer.from(encodeVarInt(input.nextState)),
  ])
  return Buffer.concat([Buffer.from(encodeVarInt(packet.length)), packet])
}

describe('readVarInt / writeVarInt', () => {
  it('round-trips a variety of values', () => {
    for (const value of [0, 1, 127, 128, 255, 300, 2097151, 2147483647]) {
      expect(readVarInt(Buffer.from(encodeVarInt(value)), 0)).toEqual({
        value,
        bytes: encodeVarInt(value).length,
      })
    }
  })
})

describe('parseMinecraftHandshake', () => {
  it('parses a valid handshake with hostname and port', () => {
    const raw = handshakeBytes({
      protocolVersion: 767,
      serverAddress: 'lobby.example.com',
      serverPort: 25565,
      nextState: 2,
    })

    const result = parseMinecraftHandshake(raw)

    expect(result).toEqual({
      protocolVersion: 767,
      serverAddress: 'lobby.example.com',
      serverPort: 25565,
      nextState: 2,
      consumed: raw.length,
    })
  })

  it('parses an address with a trailing dot and a short hostname', () => {
    const raw = handshakeBytes({
      protocolVersion: 47,
      serverAddress: 'mc.',
      serverPort: 25566,
      nextState: 1,
    })

    const result = parseMinecraftHandshake(raw)

    expect(result.serverAddress).toBe('mc.')
    expect(result.serverPort).toBe(25566)
    expect(result.nextState).toBe(1)
  })

  it('throws IncompleteHandshakeError when the buffer is too short', () => {
    const raw = handshakeBytes({
      protocolVersion: 767,
      serverAddress: 'lobby.example.com',
      serverPort: 25565,
      nextState: 2,
    })

    expect(() => parseMinecraftHandshake(raw.subarray(0, 5))).toThrow(IncompleteHandshakeError)
    expect(() => parseMinecraftHandshake(raw.subarray(0, raw.length - 1))).toThrow(
      IncompleteHandshakeError,
    )
  })

  it('throws IncompleteHandshakeError on an empty buffer', () => {
    expect(() => parseMinecraftHandshake(Buffer.alloc(0))).toThrow(IncompleteHandshakeError)
  })

  it('throws InvalidHandshakeError when the first byte of the packet is not a length', () => {
    expect(() => parseMinecraftHandshake(Buffer.from([0x01]))).toThrow(IncompleteHandshakeError)
  })

  it('throws InvalidHandshakeError when the declared length exceeds the buffer', () => {
    const raw = handshakeBytes({
      protocolVersion: 767,
      serverAddress: 'lobby.example.com',
      serverPort: 25565,
      nextState: 2,
    })
    const lengthBytes = encodeVarInt(raw.length + 10)
    const malformed = Buffer.concat([Buffer.from(lengthBytes), raw])

    expect(() => parseMinecraftHandshake(malformed)).toThrow(IncompleteHandshakeError)
  })

  it('throws InvalidHandshakeError when the packet id is not 0x00', () => {
    const payload = Buffer.concat([
      Buffer.from([0x02]),
      Buffer.from(encodeVarInt(767)),
      Buffer.from(encodeVarInt(5)),
      Buffer.from('hello'),
      Buffer.from([0x00, 0x00]),
      Buffer.from(encodeVarInt(1)),
    ])
    const raw = Buffer.concat([Buffer.from(encodeVarInt(payload.length)), payload])

    expect(() => parseMinecraftHandshake(raw)).toThrow(InvalidHandshakeError)
  })

  it('returns the number of consumed bytes so trailing data can be forwarded', () => {
    const raw = handshakeBytes({
      protocolVersion: 767,
      serverAddress: 'lobby.example.com',
      serverPort: 25565,
      nextState: 2,
    })
    const extra = Buffer.from([0xde, 0xad, 0xbe, 0xef])
    const combined = Buffer.concat([raw, extra])

    const result = parseMinecraftHandshake(combined)

    expect(result.consumed).toBe(raw.length)
  })
})
