import foryModule, { Type } from '@apache-fory/core'

import { KINDS, STANCES } from '../workloads.mjs'

export const name = '@apache-fory/core'
export const pkg = '@apache-fory/core'
export const kind = 'schema'
export const notes =
  'default config; structs evolving: false (no type meta on the wire); nullable fields; t is varuint64 (BigInt out)'

// Node gives the CommonJS exports as the default import, Bun gives exports.default
const Fory = foryModule.default ?? foryModule
const fory = new Fory()

const struct = (typeId, fields) => Type.struct({ typeId, evolving: false }, fields)
const labels = (typeId, list) => Type.enum(typeId, Object.fromEntries(list.map(label => [label, label])))
const optional = type => type.setNullable(true)

const Snapshot = struct(101, {
  t: Type.uint64(),
  entities: Type.list(
    struct(102, {
      id: Type.string(),
      name: Type.string(),
      kind: labels(201, KINDS),
      x: Type.float32(),
      y: Type.float32(),
      rot: Type.float32(),
      health: Type.uint16(),
      maxHealth: Type.uint16(),
      mana: Type.uint16(),
      level: Type.uint8(),
      alive: Type.bool(),
    }),
  ),
})

const Update = struct(103, {
  t: Type.uint64(),
  ack: Type.uint32(),
  updates: Type.list(
    struct(104, {
      id: Type.string(),
      x: optional(Type.float32()),
      y: optional(Type.float32()),
      rot: optional(Type.float32()),
      vx: optional(Type.float32()),
      vy: optional(Type.float32()),
      health: optional(Type.uint16()),
      mana: optional(Type.uint16()),
      stance: optional(labels(202, STANCES)),
    }),
  ),
})

const Input = struct(105, {
  seq: Type.uint32(),
  t: Type.uint64(),
  x: Type.float32(),
  y: Type.float32(),
  vx: Type.float32(),
  vy: Type.float32(),
  rot: Type.float32(),
  zone: Type.string(),
  actions: Type.list(struct(106, { ability: Type.string(), target: optional(Type.string()) })),
})

const present = record => {
  const out = {}
  for (const key in record) if (record[key] !== null) out[key] = record[key]
  return out
}

const session = (type, view) => {
  const { serialize, deserialize } = fory.register(type)
  const state = { encode: serialize, decode: deserialize, view }
  return () => state
}

export const workloads = {
  snapshot: session(Snapshot, decoded => ({ t: Number(decoded.t), entities: decoded.entities })),
  update: session(Update, decoded => ({
    t: Number(decoded.t),
    ack: decoded.ack,
    updates: decoded.updates.map(present),
  })),
  input: session(Input, decoded => ({ ...decoded, t: Number(decoded.t), actions: decoded.actions.map(present) })),
}
