import zorsh from '@zorsh/zorsh'

import { KINDS, STANCES } from '../workloads.mjs'

export const name = '@zorsh/zorsh'
export const pkg = '@zorsh/zorsh'
export const kind = 'schema'
export const notes =
  'Borsh; b.option needs null for an absent field, so encode fills them in; b.nativeEnum; t is u64 (BigInt)'

const { b } = zorsh
const nativeEnum = labels => b.nativeEnum(Object.fromEntries(labels.map(label => [label, label])))

const Snapshot = b.struct({
  t: b.u64(),
  entities: b.vec(
    b.struct({
      id: b.string(),
      name: b.string(),
      kind: nativeEnum(KINDS),
      x: b.f32(),
      y: b.f32(),
      rot: b.f32(),
      health: b.u16(),
      maxHealth: b.u16(),
      mana: b.u16(),
      level: b.u8(),
      alive: b.bool(),
    }),
  ),
})

const Update = b.struct({
  t: b.u64(),
  ack: b.u32(),
  updates: b.vec(
    b.struct({
      id: b.string(),
      x: b.option(b.f32()),
      y: b.option(b.f32()),
      rot: b.option(b.f32()),
      vx: b.option(b.f32()),
      vy: b.option(b.f32()),
      health: b.option(b.u16()),
      mana: b.option(b.u16()),
      stance: b.option(nativeEnum(STANCES)),
    }),
  ),
})

const Input = b.struct({
  seq: b.u32(),
  t: b.u64(),
  x: b.f32(),
  y: b.f32(),
  vx: b.f32(),
  vy: b.f32(),
  rot: b.f32(),
  zone: b.string(),
  actions: b.vec(b.struct({ ability: b.string(), target: b.option(b.string()) })),
})

const present = record => {
  const out = {}
  for (const key in record) if (record[key] !== null) out[key] = record[key]
  return out
}

const snapshot = {
  encode: message => Snapshot.serialize({ t: BigInt(message.t), entities: message.entities }),
  decode: data => Snapshot.deserialize(data),
  view: decoded => ({ t: Number(decoded.t), entities: decoded.entities }),
}

const update = {
  encode: message =>
    Update.serialize({
      t: BigInt(message.t),
      ack: message.ack,
      updates: message.updates.map(entity => ({
        id: entity.id,
        x: entity.x ?? null,
        y: entity.y ?? null,
        rot: entity.rot ?? null,
        vx: entity.vx ?? null,
        vy: entity.vy ?? null,
        health: entity.health ?? null,
        mana: entity.mana ?? null,
        stance: entity.stance ?? null,
      })),
    }),
  decode: data => Update.deserialize(data),
  view: decoded => ({ t: Number(decoded.t), ack: decoded.ack, updates: decoded.updates.map(present) }),
}

const input = {
  encode: message =>
    Input.serialize({
      ...message,
      t: BigInt(message.t),
      actions: message.actions.map(action => ({ ability: action.ability, target: action.target ?? null })),
    }),
  decode: data => Input.deserialize(data),
  view: decoded => ({ ...decoded, t: Number(decoded.t), actions: decoded.actions.map(present) }),
}

export const workloads = { snapshot: () => snapshot, update: () => update, input: () => input }
