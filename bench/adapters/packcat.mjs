import { boolean, build, enumeration, float32, float64, list, object, optional, string, uint8, varuint } from 'packcat'

import { KINDS, STANCES } from '../workloads.mjs'

export const name = 'packcat'
export const pkg = 'packcat'
export const kind = 'schema'
export const notes = 'build(schema).pack/unpack; optional() is a byte per field; t as float64 (varuint is 32 bits)'

const schemas = {
  snapshot: object({
    t: float64(),
    entities: list(
      object({
        id: string(),
        name: string(),
        kind: enumeration(KINDS),
        x: float32(),
        y: float32(),
        rot: float32(),
        health: varuint(),
        maxHealth: varuint(),
        mana: varuint(),
        level: uint8(),
        alive: boolean(),
      }),
    ),
  }),
  update: object({
    t: float64(),
    ack: varuint(),
    updates: list(
      object({
        id: string(),
        x: optional(float32()),
        y: optional(float32()),
        rot: optional(float32()),
        vx: optional(float32()),
        vy: optional(float32()),
        health: optional(varuint()),
        mana: optional(varuint()),
        stance: optional(enumeration(STANCES)),
      }),
    ),
  }),
  input: object({
    seq: varuint(),
    t: float64(),
    x: float32(),
    y: float32(),
    vx: float32(),
    vy: float32(),
    rot: float32(),
    zone: string(),
    actions: list(object({ ability: string(), target: optional(string()) })),
  }),
}

const sessionOf = schema => {
  const { pack, unpack } = build(schema)
  const session = { encode: pack, decode: unpack }
  return () => session
}

export const workloads = {
  snapshot: sessionOf(schemas.snapshot),
  update: sessionOf(schemas.update),
  input: sessionOf(schemas.input),
}
