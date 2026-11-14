import { Sia } from '@timeleap/sia'

import { KINDS, STANCES } from '../workloads.mjs'

export const name = '@timeleap/sia'
export const pkg = '@timeleap/sia'
export const kind = 'schema'
export const notes =
  'hand-written: ids addAscii8, names addUtfz, enums one byte, optional fields behind a mask byte; ' +
  'no float type, so a float32 goes as its bits in addUInt32'

// Sia has no float type: a float32 travels as its bits
const float = new Float32Array(1)
const bits = new Uint32Array(float.buffer)
const addFloat = (sia, value) => {
  float[0] = value
  return sia.addUInt32(bits[0])
}
const readFloat = sia => {
  bits[0] = sia.readUInt32()
  return float[0]
}

const addEntity = (sia, entity) => {
  sia.addAscii8(entity.id).addUtfz(entity.name).addUInt8(KINDS.indexOf(entity.kind))
  addFloat(sia, entity.x)
  addFloat(sia, entity.y)
  addFloat(sia, entity.rot)
  sia
    .addUInt16(entity.health)
    .addUInt16(entity.maxHealth)
    .addUInt16(entity.mana)
    .addUInt8(entity.level)
    .addBool(entity.alive)
}
const readEntity = sia => ({
  id: sia.readAscii8(),
  name: sia.readUtfz(),
  kind: KINDS[sia.readUInt8()],
  x: readFloat(sia),
  y: readFloat(sia),
  rot: readFloat(sia),
  health: sia.readUInt16(),
  maxHealth: sia.readUInt16(),
  mana: sia.readUInt16(),
  level: sia.readUInt8(),
  alive: sia.readBool(),
})

const addChange = (sia, change) => {
  const { x, y, rot, vx, vy, health, mana, stance } = change
  sia
    .addAscii8(change.id)
    .addUInt8(
      (x === undefined ? 0 : 1) |
        (y === undefined ? 0 : 2) |
        (rot === undefined ? 0 : 4) |
        (vx === undefined ? 0 : 8) |
        (vy === undefined ? 0 : 16) |
        (health === undefined ? 0 : 32) |
        (mana === undefined ? 0 : 64) |
        (stance === undefined ? 0 : 128),
    )
  if (x !== undefined) addFloat(sia, x)
  if (y !== undefined) addFloat(sia, y)
  if (rot !== undefined) addFloat(sia, rot)
  if (vx !== undefined) addFloat(sia, vx)
  if (vy !== undefined) addFloat(sia, vy)
  if (health !== undefined) sia.addUInt16(health)
  if (mana !== undefined) sia.addUInt16(mana)
  if (stance !== undefined) sia.addUInt8(STANCES.indexOf(stance))
}
const readChange = sia => {
  const id = sia.readAscii8()
  const mask = sia.readUInt8()
  return {
    id,
    x: mask & 1 ? readFloat(sia) : undefined,
    y: mask & 2 ? readFloat(sia) : undefined,
    rot: mask & 4 ? readFloat(sia) : undefined,
    vx: mask & 8 ? readFloat(sia) : undefined,
    vy: mask & 16 ? readFloat(sia) : undefined,
    health: mask & 32 ? sia.readUInt16() : undefined,
    mana: mask & 64 ? sia.readUInt16() : undefined,
    stance: mask & 128 ? STANCES[sia.readUInt8()] : undefined,
  }
}

const addAction = (sia, action) => {
  sia.addAscii8(action.ability).addBool(action.target !== undefined)
  if (action.target !== undefined) sia.addAscii8(action.target)
}
const readAction = sia => ({
  ability: sia.readAscii8(),
  target: sia.readBool() ? sia.readAscii8() : undefined,
})

const writer = new Sia()
const reader = Sia.alloc(0)

const snapshot = () => ({
  encode: message => writer.seek(0).addUInt64(message.t).addArray8(message.entities, addEntity).toUint8Array(),
  decode: data => {
    const sia = reader.setContent(data)
    return { t: sia.readUInt64(), entities: sia.readArray8(readEntity) }
  },
})

const update = () => ({
  encode: message =>
    writer.seek(0).addUInt64(message.t).addUInt32(message.ack).addArray8(message.updates, addChange).toUint8Array(),
  decode: data => {
    const sia = reader.setContent(data)
    return { t: sia.readUInt64(), ack: sia.readUInt32(), updates: sia.readArray8(readChange) }
  },
})

const input = () => ({
  encode: message => {
    writer.seek(0).addUInt32(message.seq).addUInt64(message.t)
    addFloat(writer, message.x)
    addFloat(writer, message.y)
    addFloat(writer, message.vx)
    addFloat(writer, message.vy)
    addFloat(writer, message.rot)
    return writer.addAscii8(message.zone).addArray8(message.actions, addAction).toUint8Array()
  },
  decode: data => {
    const sia = reader.setContent(data)
    return {
      seq: sia.readUInt32(),
      t: sia.readUInt64(),
      x: readFloat(sia),
      y: readFloat(sia),
      vx: readFloat(sia),
      vy: readFloat(sia),
      rot: readFloat(sia),
      zone: sia.readAscii8(),
      actions: sia.readArray8(readAction),
    }
  },
})

export const workloads = { snapshot, update, input }
