import { arrayOf } from '@javelin/core'
import { boolean, createModel, decode, encode, float32, float64, string8, uint8, uint16, uint32 } from '@javelin/pack'

import { KINDS, STANCES } from '../workloads.mjs'

export const name = '@javelin/pack'
export const pkg = '@javelin/pack'
export const kind = 'schema'
export const notes =
  'encode/decode on a createModel node; fixed-length string8 padded with zeros (id and target 20, name 12, zone ' +
  'and ability 5); no optional fields: a mask and every field; enums as uint8; t as float64'

const KIND_INDEX = Object.fromEntries(KINDS.map((value, i) => [value, i]))
const STANCE_INDEX = Object.fromEntries(STANCES.map((value, i) => [value, i]))
const id = { ...string8, length: 20 }
const short = { ...string8, length: 5 }

const model = createModel(
  new Map([
    [
      0,
      {
        t: float64,
        entities: arrayOf({
          id,
          name: { ...string8, length: 12 },
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
      },
    ],
    [
      1,
      {
        t: float64,
        ack: uint32,
        updates: arrayOf({
          id,
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
      },
    ],
    [
      2,
      {
        seq: uint32,
        t: float64,
        x: float32,
        y: float32,
        vx: float32,
        vy: float32,
        rot: float32,
        zone: short,
        actions: arrayOf({ ability: short, hasTarget: boolean, target: id }),
      },
    ],
  ]),
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
    encode(
      {
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
      },
      model[0],
    ),
  decode: data => decode(data, model[0]),
  view: decoded => ({
    t: decoded.t,
    entities: decoded.entities.map(entity => ({ ...entity, kind: KINDS[entity.kind] })),
  }),
}

const update = {
  encode: message =>
    encode(
      {
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
      },
      model[1],
    ),
  decode: data => decode(data, model[1]),
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
    encode(
      {
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
      },
      model[2],
    ),
  decode: data => decode(data, model[2]),
  view: decoded => ({
    ...decoded,
    actions: decoded.actions.map(action =>
      action.hasTarget ? { ability: action.ability, target: action.target } : { ability: action.ability },
    ),
  }),
}

export const workloads = { snapshot: () => snapshot, update: () => update, input: () => input }
