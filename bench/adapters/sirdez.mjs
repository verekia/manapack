import * as sd from 'sirdez/eval'

import { KINDS, STANCES } from '../workloads.mjs'

export const name = 'sirdez'
export const pkg = 'sirdez'
export const kind = 'schema'
export const notes =
  'sirdez/eval, use(struct).toBytes/fromBytes; optional() is a byte per field; enums as uint8; t as float64 ' +
  '(usize is 31 bits); usize varints for the other integers'

const KIND_INDEX = Object.fromEntries(KINDS.map((value, i) => [value, i]))
const STANCE_INDEX = Object.fromEntries(STANCES.map((value, i) => [value, i]))
const string = sd.string(sd.utf8, sd.usize)

const snapshotCodec = sd.use(
  sd.struct({
    t: sd.float64,
    entities: sd.array(
      sd.struct({
        id: string,
        name: string,
        kind: sd.uint8,
        x: sd.float32,
        y: sd.float32,
        rot: sd.float32,
        health: sd.usize,
        maxHealth: sd.usize,
        mana: sd.usize,
        level: sd.uint8,
        alive: sd.boolean,
      }),
      sd.usize,
    ),
  }),
)
const updateCodec = sd.use(
  sd.struct({
    t: sd.float64,
    ack: sd.usize,
    updates: sd.array(
      sd.struct({
        id: string,
        x: sd.optional(sd.float32),
        y: sd.optional(sd.float32),
        rot: sd.optional(sd.float32),
        vx: sd.optional(sd.float32),
        vy: sd.optional(sd.float32),
        health: sd.optional(sd.usize),
        mana: sd.optional(sd.usize),
        stance: sd.optional(sd.uint8),
      }),
      sd.usize,
    ),
  }),
)
const inputCodec = sd.use(
  sd.struct({
    seq: sd.usize,
    t: sd.float64,
    x: sd.float32,
    y: sd.float32,
    vx: sd.float32,
    vy: sd.float32,
    rot: sd.float32,
    zone: string,
    actions: sd.array(sd.struct({ ability: string, target: sd.optional(string) }), sd.usize),
  }),
)

const snapshot = {
  encode: message =>
    snapshotCodec.toBytes({
      t: message.t,
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
    }),
  decode: data => snapshotCodec.fromBytes(data),
  view: decoded => ({
    t: decoded.t,
    entities: decoded.entities.map(entity => ({ ...entity, kind: KINDS[entity.kind] })),
  }),
}

const update = {
  encode: message =>
    updateCodec.toBytes({
      t: message.t,
      ack: message.ack,
      updates: message.updates.map(change =>
        change.stance === undefined ? change : { ...change, stance: STANCE_INDEX[change.stance] },
      ),
    }),
  decode: data => updateCodec.fromBytes(data),
  view: decoded => ({
    t: decoded.t,
    ack: decoded.ack,
    updates: decoded.updates.map(change =>
      change.stance === undefined ? change : { ...change, stance: STANCES[change.stance] },
    ),
  }),
}

const input = { encode: message => inputCodec.toBytes(message), decode: data => inputCodec.fromBytes(data) }

export const workloads = { snapshot: () => snapshot, update: () => update, input: () => input }
