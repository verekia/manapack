import binary from 'js-binary'

import { KINDS, STANCES } from '../workloads.mjs'

export const name = 'js-binary'
export const pkg = 'js-binary'
export const kind = 'schema'
export const notes =
  "Type.encode/decode; 'field?' optionals are a byte per field; floats are 64 bits (no float32); integers and t " +
  'as uint varints; enums as uint'

const KIND_INDEX = Object.fromEntries(KINDS.map((value, i) => [value, i]))
const STANCE_INDEX = Object.fromEntries(STANCES.map((value, i) => [value, i]))

const snapshotType = new binary.Type({
  t: 'uint',
  entities: [
    {
      id: 'string',
      name: 'string',
      kind: 'uint',
      x: 'float',
      y: 'float',
      rot: 'float',
      health: 'uint',
      maxHealth: 'uint',
      mana: 'uint',
      level: 'uint',
      alive: 'boolean',
    },
  ],
})
const updateType = new binary.Type({
  t: 'uint',
  ack: 'uint',
  updates: [
    {
      id: 'string',
      'x?': 'float',
      'y?': 'float',
      'rot?': 'float',
      'vx?': 'float',
      'vy?': 'float',
      'health?': 'uint',
      'mana?': 'uint',
      'stance?': 'uint',
    },
  ],
})
const inputType = new binary.Type({
  seq: 'uint',
  t: 'uint',
  x: 'float',
  y: 'float',
  vx: 'float',
  vy: 'float',
  rot: 'float',
  zone: 'string',
  actions: [{ ability: 'string', 'target?': 'string' }],
})

const snapshot = {
  encode: message =>
    snapshotType.encode({
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
  decode: data => snapshotType.decode(data),
  view: decoded => ({
    t: decoded.t,
    entities: decoded.entities.map(entity => ({ ...entity, kind: KINDS[entity.kind] })),
  }),
}

const update = {
  encode: message =>
    updateType.encode({
      t: message.t,
      ack: message.ack,
      updates: message.updates.map(change =>
        change.stance === undefined ? change : { ...change, stance: STANCE_INDEX[change.stance] },
      ),
    }),
  decode: data => updateType.decode(data),
  view: decoded => ({
    t: decoded.t,
    ack: decoded.ack,
    updates: decoded.updates.map(change =>
      change.stance === undefined ? change : { ...change, stance: STANCES[change.stance] },
    ),
  }),
}

const input = { encode: message => inputType.encode(message), decode: data => inputType.decode(data) }

export const workloads = { snapshot: () => snapshot, update: () => update, input: () => input }
