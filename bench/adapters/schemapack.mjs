import schemapack from 'schemapack'

import { KINDS, STANCES } from '../workloads.mjs'

export const name = 'schemapack'
export const pkg = 'schemapack'
export const kind = 'schema'
export const notes =
  'build(schema, false): validation off; no optional fields: a mask and every field; enums as uint8; t as ' +
  'float64 (varuint is 31 bits)'

const KIND_INDEX = Object.fromEntries(KINDS.map((value, i) => [value, i]))
const STANCE_INDEX = Object.fromEntries(STANCES.map((value, i) => [value, i]))

const snapshotSchema = schemapack.build(
  {
    t: 'float64',
    entities: [
      {
        id: 'string',
        name: 'string',
        kind: 'uint8',
        x: 'float32',
        y: 'float32',
        rot: 'float32',
        health: 'varuint',
        maxHealth: 'varuint',
        mana: 'varuint',
        level: 'uint8',
        alive: 'bool',
      },
    ],
  },
  false,
)
const updateSchema = schemapack.build(
  {
    t: 'float64',
    ack: 'varuint',
    updates: [
      {
        id: 'string',
        mask: 'uint8',
        x: 'float32',
        y: 'float32',
        rot: 'float32',
        vx: 'float32',
        vy: 'float32',
        health: 'varuint',
        mana: 'varuint',
        stance: 'uint8',
      },
    ],
  },
  false,
)
const inputSchema = schemapack.build(
  {
    seq: 'varuint',
    t: 'float64',
    x: 'float32',
    y: 'float32',
    vx: 'float32',
    vy: 'float32',
    rot: 'float32',
    zone: 'string',
    actions: [{ ability: 'string', hasTarget: 'bool', target: 'string' }],
  },
  false,
)

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
    snapshotSchema.encode({
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
  decode: data => snapshotSchema.decode(data),
  view: decoded => ({
    t: decoded.t,
    entities: decoded.entities.map(entity => ({ ...entity, kind: KINDS[entity.kind] })),
  }),
}

const update = {
  encode: message =>
    updateSchema.encode({
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
  decode: data => updateSchema.decode(data),
  view: decoded => ({
    t: decoded.t,
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
    inputSchema.encode({
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
  decode: data => inputSchema.decode(data),
  view: decoded => ({
    ...decoded,
    actions: decoded.actions.map(action =>
      action.hasTarget ? { ability: action.ability, target: action.target } : { ability: action.ability },
    ),
  }),
}

export const workloads = { snapshot: () => snapshot, update: () => update, input: () => input }
