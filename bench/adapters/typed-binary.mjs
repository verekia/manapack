import {
  bool,
  BufferReader,
  BufferWriter,
  dynamicArrayOf,
  f32,
  f64Array,
  object,
  optional,
  string,
  u8,
  u16,
  u32,
} from 'typed-binary'

import { KINDS, STANCES } from '../workloads.mjs'

export const name = 'typed-binary'
export const pkg = 'typed-binary'
export const kind = 'schema'
export const notes =
  'one reused BufferWriter, bytes copied out; optional() is a byte per field; enums as u8; t as f64Array(1), ' +
  'its only 64-bit type'

const KIND_INDEX = Object.fromEntries(KINDS.map((value, i) => [value, i]))
const STANCE_INDEX = Object.fromEntries(STANCES.map((value, i) => [value, i]))
const time = f64Array(1)

const schemas = {
  snapshot: object({
    t: time,
    entities: dynamicArrayOf(
      object({
        id: string,
        name: string,
        kind: u8,
        x: f32,
        y: f32,
        rot: f32,
        health: u16,
        maxHealth: u16,
        mana: u16,
        level: u8,
        alive: bool,
      }),
    ),
  }),
  update: object({
    t: time,
    ack: u32,
    updates: dynamicArrayOf(
      object({
        id: string,
        x: optional(f32),
        y: optional(f32),
        rot: optional(f32),
        vx: optional(f32),
        vy: optional(f32),
        health: optional(u16),
        mana: optional(u16),
        stance: optional(u8),
      }),
    ),
  }),
  input: object({
    seq: u32,
    t: time,
    x: f32,
    y: f32,
    vx: f32,
    vy: f32,
    rot: f32,
    zone: string,
    actions: dynamicArrayOf(object({ ability: string, target: optional(string) })),
  }),
}

const scratch = new Uint8Array(65536)
const writer = new BufferWriter(scratch)
const t = new Float64Array(1)

const sessionOf = (schema, convert, view) => {
  const session = {
    encode: message => {
      writer.seekTo(0)
      schema.write(writer, convert(message))
      return scratch.slice(0, writer.currentByteOffset)
    },
    decode: data => schema.read(new BufferReader(data)),
    view,
  }
  return () => session
}

export const workloads = {
  snapshot: sessionOf(
    schemas.snapshot,
    message => {
      t[0] = message.t
      return {
        t,
        entities: message.entities.map(entity => ({
          id: entity.id,
          name: entity.name,
          kind: KIND_INDEX[entity.kind],
          x: entity.x,
          y: entity.y,
          rot: entity.rot,
          health: entity.health,
          maxHealth: entity.maxHealth,
          mana: entity.mana,
          level: entity.level,
          alive: entity.alive,
        })),
      }
    },
    decoded => ({
      t: decoded.t[0],
      entities: decoded.entities.map(entity => ({ ...entity, kind: KINDS[entity.kind] })),
    }),
  ),
  update: sessionOf(
    schemas.update,
    message => {
      t[0] = message.t
      return {
        t,
        ack: message.ack,
        updates: message.updates.map(change =>
          change.stance === undefined ? change : { ...change, stance: STANCE_INDEX[change.stance] },
        ),
      }
    },
    decoded => ({
      t: decoded.t[0],
      ack: decoded.ack,
      updates: decoded.updates.map(change =>
        change.stance === undefined ? change : { ...change, stance: STANCES[change.stance] },
      ),
    }),
  ),
  input: sessionOf(
    schemas.input,
    message => {
      t[0] = message.t
      return {
        seq: message.seq,
        t,
        x: message.x,
        y: message.y,
        vx: message.vx,
        vy: message.vy,
        rot: message.rot,
        zone: message.zone,
        actions: message.actions,
      }
    },
    decoded => ({ ...decoded, t: decoded.t[0] }),
  ),
}
