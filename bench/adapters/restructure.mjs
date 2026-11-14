import * as r from 'restructure'

import { KINDS, STANCES } from '../workloads.mjs'

export const name = 'restructure'
export const pkg = 'restructure'
export const kind = 'schema'
export const notes =
  'r.Optional on a uint8 presence mask that encode computes; no 64-bit int, so t is a double; uint8 string lengths'

const string = new r.String(r.uint8, 'utf8')
// The condition is given the struct when decoding, and a context that holds it (val) when sizing and encoding
const optional = (type, bit) => new r.Optional(type, parent => (parent.val ?? parent).mask & bit)

const Snapshot = new r.Struct({
  t: r.double,
  entities: new r.Array(
    new r.Struct({
      id: string,
      name: string,
      kind: new r.Enum(r.uint8, KINDS),
      x: r.float,
      y: r.float,
      rot: r.float,
      health: r.uint16,
      maxHealth: r.uint16,
      mana: r.uint16,
      level: r.uint8,
      alive: new r.Boolean(r.uint8),
    }),
    r.uint16,
  ),
})

const Update = new r.Struct({
  t: r.double,
  ack: r.uint32,
  updates: new r.Array(
    new r.Struct({
      id: string,
      mask: r.uint8,
      x: optional(r.float, 1),
      y: optional(r.float, 2),
      rot: optional(r.float, 4),
      vx: optional(r.float, 8),
      vy: optional(r.float, 16),
      health: optional(r.uint16, 32),
      mana: optional(r.uint16, 64),
      stance: optional(new r.Enum(r.uint8, STANCES), 128),
    }),
    r.uint16,
  ),
})

const Input = new r.Struct({
  seq: r.uint32,
  t: r.double,
  x: r.float,
  y: r.float,
  vx: r.float,
  vy: r.float,
  rot: r.float,
  zone: string,
  actions: new r.Array(new r.Struct({ ability: string, mask: r.uint8, target: optional(string, 1) }), r.uint8),
})

const updateMask = entity =>
  (entity.x === undefined ? 0 : 1) |
  (entity.y === undefined ? 0 : 2) |
  (entity.rot === undefined ? 0 : 4) |
  (entity.vx === undefined ? 0 : 8) |
  (entity.vy === undefined ? 0 : 16) |
  (entity.health === undefined ? 0 : 32) |
  (entity.mana === undefined ? 0 : 64) |
  (entity.stance === undefined ? 0 : 128)

const unmasked = ({ mask, ...fields }) => fields

const snapshot = { encode: message => Snapshot.toBuffer(message), decode: data => Snapshot.fromBuffer(data) }

const update = {
  encode: message =>
    Update.toBuffer({
      t: message.t,
      ack: message.ack,
      updates: message.updates.map(entity => ({ ...entity, mask: updateMask(entity) })),
    }),
  decode: data => Update.fromBuffer(data),
  view: decoded => ({ ...decoded, updates: decoded.updates.map(unmasked) }),
}

const input = {
  encode: message =>
    Input.toBuffer({
      ...message,
      actions: message.actions.map(action => ({ ...action, mask: action.target === undefined ? 0 : 1 })),
    }),
  decode: data => Input.fromBuffer(data),
  view: decoded => ({ ...decoded, actions: decoded.actions.map(unmasked) }),
}

export const workloads = { snapshot: () => snapshot, update: () => update, input: () => input }
