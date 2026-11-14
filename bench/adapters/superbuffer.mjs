import superbuffer from 'superbuffer'

import { KINDS, STANCES } from '../workloads.mjs'

const { Model, Schema, boolean, float32, string, uint8, uint16, uint32, uint64 } = superbuffer

export const name = 'superbuffer'
export const pkg = 'superbuffer'
export const kind = 'schema'
export const notes =
  'Model.toBuffer/fromBuffer; no optional fields: a mask and every field; enums as uint8; t as uint64 (read as ' +
  'a BigInt); floats rounded to 7 digits by the library'

const KIND_INDEX = Object.fromEntries(KINDS.map((value, i) => [value, i]))
const STANCE_INDEX = Object.fromEntries(STANCES.map((value, i) => [value, i]))

const snapshotModel = Model.fromSchemaDefinition({
  t: uint64,
  entities: [
    new Schema({
      id: string,
      name: string,
      kind: uint8,
      x: float32,
      y: float32,
      rot: float32,
      health: uint16,
      maxHealth: uint16,
      mana: uint16,
      level: uint8,
      alive: boolean,
    }),
  ],
})
const updateModel = Model.fromSchemaDefinition({
  t: uint64,
  ack: uint32,
  updates: [
    new Schema({
      id: string,
      mask: uint8,
      x: float32,
      y: float32,
      rot: float32,
      vx: float32,
      vy: float32,
      health: uint16,
      mana: uint16,
      stance: uint8,
    }),
  ],
})
const inputModel = Model.fromSchemaDefinition({
  seq: uint32,
  t: uint64,
  x: float32,
  y: float32,
  vx: float32,
  vy: float32,
  rot: float32,
  zone: string,
  actions: [new Schema({ ability: string, hasTarget: boolean, target: string })],
})

const maskOf = change =>
  (change.x === undefined ? 0 : 1) |
  (change.y === undefined ? 0 : 2) |
  (change.rot === undefined ? 0 : 4) |
  (change.vx === undefined ? 0 : 8) |
  (change.vy === undefined ? 0 : 16) |
  (change.health === undefined ? 0 : 32) |
  (change.mana === undefined ? 0 : 64) |
  (change.stance === undefined ? 0 : 128)
const UPDATE_FIELDS = ['x', 'y', 'rot', 'vx', 'vy', 'health', 'mana']

const snapshot = {
  encode: message =>
    snapshotModel.toBuffer({
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
  decode: data => snapshotModel.fromBuffer(data),
  view: decoded => ({
    t: Number(decoded.t),
    entities: decoded.entities.map(entity => ({ ...entity, kind: KINDS[entity.kind] })),
  }),
}

const update = {
  encode: message =>
    updateModel.toBuffer({
      t: message.t,
      ack: message.ack,
      updates: message.updates.map(change => ({
        id: change.id,
        mask: maskOf(change),
        x: change.x ?? 0,
        y: change.y ?? 0,
        rot: change.rot ?? 0,
        vx: change.vx ?? 0,
        vy: change.vy ?? 0,
        health: change.health ?? 0,
        mana: change.mana ?? 0,
        stance: change.stance === undefined ? 0 : STANCE_INDEX[change.stance],
      })),
    }),
  decode: data => updateModel.fromBuffer(data),
  view: decoded => ({
    t: Number(decoded.t),
    ack: decoded.ack,
    updates: decoded.updates.map(entity => {
      const change = { id: entity.id }
      for (let i = 0; i < 7; i++) if (entity.mask & (1 << i)) change[UPDATE_FIELDS[i]] = entity[UPDATE_FIELDS[i]]
      if (entity.mask & 128) change.stance = STANCES[entity.stance]
      return change
    }),
  }),
}

const input = {
  encode: message =>
    inputModel.toBuffer({
      seq: message.seq,
      t: message.t,
      x: message.x,
      y: message.y,
      vx: message.vx,
      vy: message.vy,
      rot: message.rot,
      zone: message.zone,
      actions: message.actions.map(action => ({
        ability: action.ability,
        hasTarget: action.target !== undefined,
        target: action.target ?? '',
      })),
    }),
  decode: data => inputModel.fromBuffer(data),
  view: decoded => ({
    ...decoded,
    t: Number(decoded.t),
    actions: decoded.actions.map(action =>
      action.hasTarget ? { ability: action.ability, target: action.target } : { ability: action.ability },
    ),
  }),
}

export const workloads = { snapshot: () => snapshot, update: () => update, input: () => input }
