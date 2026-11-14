import * as flatbuffers from 'flatbuffers'

import { Input, Snapshot, Update } from '../flatbuffers/generated.mjs'
import { KINDS, STANCES } from '../workloads.mjs'
import { encodeInput, encodeSnapshot, encodeUpdate } from './flatbuffers.mjs'

export const name = 'flatbuffers (object API)'
export const pkg = 'flatbuffers'
export const kind = 'schema'
export const notes =
  'as the row above for the write; the reader builds objects with unpack(), the object API (--gen-object-api)'

const OPTIONAL = ['x', 'y', 'rot', 'vx', 'vy', 'health', 'mana']

const snapshot = {
  encode: encodeSnapshot,
  decode: data => Snapshot.getRootAsSnapshot(new flatbuffers.ByteBuffer(data)).unpack(),
  view: decoded => ({
    t: Number(decoded.t),
    entities: decoded.entities.map(entity => ({ ...entity, kind: KINDS[entity.kind] })),
  }),
}

const update = {
  encode: encodeUpdate,
  decode: data => Update.getRootAsUpdate(new flatbuffers.ByteBuffer(data)).unpack(),
  view: decoded => ({
    t: Number(decoded.t),
    ack: decoded.ack,
    updates: decoded.updates.map(change => {
      const out = { id: change.id }
      for (const field of OPTIONAL) if (change[field] !== null) out[field] = change[field]
      if (change.stance !== null) out.stance = STANCES[change.stance]
      return out
    }),
  }),
}

const input = {
  encode: encodeInput,
  decode: data => Input.getRootAsInput(new flatbuffers.ByteBuffer(data)).unpack(),
  view: decoded => ({
    seq: decoded.seq,
    t: Number(decoded.t),
    x: decoded.x,
    y: decoded.y,
    vx: decoded.vx,
    vy: decoded.vy,
    rot: decoded.rot,
    zone: decoded.zone,
    actions: decoded.actions.map(action =>
      action.target === null ? { ability: action.ability } : { ability: action.ability, target: action.target },
    ),
  }),
}

export const workloads = { snapshot: () => snapshot, update: () => update, input: () => input }
