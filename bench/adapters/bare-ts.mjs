import * as bare from '@bare-ts/lib'

import { KINDS, STANCES } from '../workloads.mjs'

export const name = '@bare-ts/lib'
export const pkg = '@bare-ts/lib'
export const kind = 'schema'
export const notes =
  'BARE, hand-written as bare-ts generates it (safe ints, undefined for none); optional<T> is a bool then T; t is uint'

const config = bare.Config({})

const indexOf = labels => Object.fromEntries(labels.map((label, i) => [label, i]))
const KIND_INDEX = indexOf(KINDS)
const STANCE_INDEX = indexOf(STANCES)

const readEnum = (bc, labels) => {
  const offset = bc.offset
  const label = labels[bare.readU8(bc)]
  if (label === undefined) {
    bc.offset = offset
    throw new bare.BareError(offset, 'invalid tag')
  }
  return label
}

const readEntity = bc => ({
  id: bare.readString(bc),
  name: bare.readString(bc),
  kind: readEnum(bc, KINDS),
  x: bare.readF32(bc),
  y: bare.readF32(bc),
  rot: bare.readF32(bc),
  health: bare.readU16(bc),
  maxHealth: bare.readU16(bc),
  mana: bare.readU16(bc),
  level: bare.readU8(bc),
  alive: bare.readBool(bc),
})
const writeEntity = (bc, x) => {
  bare.writeString(bc, x.id)
  bare.writeString(bc, x.name)
  bare.writeU8(bc, KIND_INDEX[x.kind])
  bare.writeF32(bc, x.x)
  bare.writeF32(bc, x.y)
  bare.writeF32(bc, x.rot)
  bare.writeU16(bc, x.health)
  bare.writeU16(bc, x.maxHealth)
  bare.writeU16(bc, x.mana)
  bare.writeU8(bc, x.level)
  bare.writeBool(bc, x.alive)
}

const readList = (bc, read) => {
  const len = bare.readUintSafe(bc)
  if (len === 0) return []
  const result = [read(bc)]
  for (let i = 1; i < len; i++) result[i] = read(bc)
  return result
}
const writeList = (bc, x, write) => {
  bare.writeUintSafe(bc, x.length)
  for (let i = 0; i < x.length; i++) write(bc, x[i])
}

const readSnapshot = bc => ({ t: bare.readUintSafe(bc), entities: readList(bc, readEntity) })
const writeSnapshot = (bc, x) => {
  bare.writeUintSafe(bc, x.t)
  writeList(bc, x.entities, writeEntity)
}

const readOptionalF32 = bc => (bare.readBool(bc) ? bare.readF32(bc) : undefined)
const writeOptionalF32 = (bc, x) => {
  bare.writeBool(bc, x !== undefined)
  if (x !== undefined) bare.writeF32(bc, x)
}
const readOptionalU16 = bc => (bare.readBool(bc) ? bare.readU16(bc) : undefined)
const writeOptionalU16 = (bc, x) => {
  bare.writeBool(bc, x !== undefined)
  if (x !== undefined) bare.writeU16(bc, x)
}
const readOptionalStance = bc => (bare.readBool(bc) ? readEnum(bc, STANCES) : undefined)
const writeOptionalStance = (bc, x) => {
  bare.writeBool(bc, x !== undefined)
  if (x !== undefined) bare.writeU8(bc, STANCE_INDEX[x])
}
const readOptionalString = bc => (bare.readBool(bc) ? bare.readString(bc) : undefined)
const writeOptionalString = (bc, x) => {
  bare.writeBool(bc, x !== undefined)
  if (x !== undefined) bare.writeString(bc, x)
}

const readEntityUpdate = bc => ({
  id: bare.readString(bc),
  x: readOptionalF32(bc),
  y: readOptionalF32(bc),
  rot: readOptionalF32(bc),
  vx: readOptionalF32(bc),
  vy: readOptionalF32(bc),
  health: readOptionalU16(bc),
  mana: readOptionalU16(bc),
  stance: readOptionalStance(bc),
})
const writeEntityUpdate = (bc, x) => {
  bare.writeString(bc, x.id)
  writeOptionalF32(bc, x.x)
  writeOptionalF32(bc, x.y)
  writeOptionalF32(bc, x.rot)
  writeOptionalF32(bc, x.vx)
  writeOptionalF32(bc, x.vy)
  writeOptionalU16(bc, x.health)
  writeOptionalU16(bc, x.mana)
  writeOptionalStance(bc, x.stance)
}

const readUpdate = bc => ({
  t: bare.readUintSafe(bc),
  ack: bare.readU32(bc),
  updates: readList(bc, readEntityUpdate),
})
const writeUpdate = (bc, x) => {
  bare.writeUintSafe(bc, x.t)
  bare.writeU32(bc, x.ack)
  writeList(bc, x.updates, writeEntityUpdate)
}

const readAction = bc => ({ ability: bare.readString(bc), target: readOptionalString(bc) })
const writeAction = (bc, x) => {
  bare.writeString(bc, x.ability)
  writeOptionalString(bc, x.target)
}

const readInput = bc => ({
  seq: bare.readU32(bc),
  t: bare.readUintSafe(bc),
  x: bare.readF32(bc),
  y: bare.readF32(bc),
  vx: bare.readF32(bc),
  vy: bare.readF32(bc),
  rot: bare.readF32(bc),
  zone: bare.readString(bc),
  actions: readList(bc, readAction),
})
const writeInput = (bc, x) => {
  bare.writeU32(bc, x.seq)
  bare.writeUintSafe(bc, x.t)
  bare.writeF32(bc, x.x)
  bare.writeF32(bc, x.y)
  bare.writeF32(bc, x.vx)
  bare.writeF32(bc, x.vy)
  bare.writeF32(bc, x.rot)
  bare.writeString(bc, x.zone)
  writeList(bc, x.actions, writeAction)
}

const present = record => {
  const out = {}
  for (const key in record) if (record[key] !== undefined) out[key] = record[key]
  return out
}

const session = (read, write, view) => {
  const state = {
    encode: message => {
      const bc = new bare.ByteCursor(new Uint8Array(config.initialBufferLength), config)
      write(bc, message)
      return new Uint8Array(bc.view.buffer, bc.view.byteOffset, bc.offset)
    },
    decode: data => {
      const bc = new bare.ByteCursor(data, config)
      const result = read(bc)
      if (bc.offset < bc.view.byteLength) throw new bare.BareError(bc.offset, 'remaining bytes')
      return result
    },
    view,
  }
  return () => state
}

export const workloads = {
  snapshot: session(readSnapshot, writeSnapshot),
  update: session(readUpdate, writeUpdate, decoded => ({ ...decoded, updates: decoded.updates.map(present) })),
  input: session(readInput, writeInput, decoded => ({ ...decoded, actions: decoded.actions.map(present) })),
}
