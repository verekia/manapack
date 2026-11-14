import { defineFormat, optional, setTinybufConfig, Type } from 'tinybuf'

import { KINDS, STANCES } from '../workloads.mjs'

export const name = 'tinybuf'
export const pkg = 'tinybuf'
export const kind = 'schema'
export const notes =
  'headerless formats; encode(data, true) copies out of the shared buffer; encodingBufferMaxSize raised from ' +
  '1500; optional() is a byte per field; enums as UInt8 through setTransforms; t as UInt (8 bytes)'

setTinybufConfig({ encodingBufferMaxSize: 16384 })

const enumOf = values => {
  const index = Object.fromEntries(values.map((value, i) => [value, i]))
  return [value => index[value], i => values[i]]
}

const formats = {
  snapshot: defineFormat(null, {
    t: Type.UInt,
    entities: [
      {
        id: Type.String,
        name: Type.String,
        kind: Type.UInt8,
        x: Type.Float32,
        y: Type.Float32,
        rot: Type.Float32,
        health: Type.UInt,
        maxHealth: Type.UInt,
        mana: Type.UInt,
        level: Type.UInt8,
        alive: Type.Bool,
      },
    ],
  }).setTransforms({ entities: { kind: enumOf(KINDS) } }),
  update: defineFormat(null, {
    t: Type.UInt,
    ack: Type.UInt,
    updates: [
      {
        id: Type.String,
        x: optional(Type.Float32),
        y: optional(Type.Float32),
        rot: optional(Type.Float32),
        vx: optional(Type.Float32),
        vy: optional(Type.Float32),
        health: optional(Type.UInt),
        mana: optional(Type.UInt),
        stance: optional(Type.UInt8),
      },
    ],
  }).setTransforms({ updates: { stance: enumOf(STANCES) } }),
  input: defineFormat(null, {
    seq: Type.UInt,
    t: Type.UInt,
    x: Type.Float32,
    y: Type.Float32,
    vx: Type.Float32,
    vy: Type.Float32,
    rot: Type.Float32,
    zone: Type.String,
    actions: [{ ability: Type.String, target: optional(Type.String) }],
  }),
}

const sessionOf = format => {
  const session = { encode: message => format.encode(message, true), decode: data => format.decode(data) }
  return () => session
}

export const workloads = {
  snapshot: sessionOf(formats.snapshot),
  update: sessionOf(formats.update),
  input: sessionOf(formats.input),
}
