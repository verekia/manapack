import { createDes, createSer } from 'seqproto'

import { KINDS, STANCES } from '../workloads.mjs'

export const name = 'seqproto'
export const pkg = 'seqproto'
export const kind = 'schema'
export const notes =
  'hand-written functions on one reused Ser and Des; every value is a 32-bit word; optional fields: a uint32 ' +
  'mask then the present ones; enums as uint32; t as two uint32'

const KIND_INDEX = Object.fromEntries(KINDS.map((value, i) => [value, i]))
const STANCE_INDEX = Object.fromEntries(STANCES.map((value, i) => [value, i]))
const HIGH = 2 ** 32

const ser = createSer({ bufferSize: 2 ** 16 })
const des = createDes(new ArrayBuffer(0))

const writeTime = t => {
  ser.serializeUInt32(Math.floor(t / HIGH))
  ser.serializeUInt32(t >>> 0)
}
const readTime = () => des.deserializeUInt32() * HIGH + des.deserializeUInt32()

const writeSnapshotEntity = (writer, entity) => {
  writer.serializeString(entity.id)
  writer.serializeString(entity.name)
  writer.serializeUInt32(KIND_INDEX[entity.kind])
  writer.serializeFloat32(entity.x)
  writer.serializeFloat32(entity.y)
  writer.serializeFloat32(entity.rot)
  writer.serializeUInt32(entity.health)
  writer.serializeUInt32(entity.maxHealth)
  writer.serializeUInt32(entity.mana)
  writer.serializeUInt32(entity.level)
  writer.serializeBoolean(entity.alive)
}
const readSnapshotEntity = reader => ({
  id: reader.deserializeString(),
  name: reader.deserializeString(),
  kind: KINDS[reader.deserializeUInt32()],
  x: reader.deserializeFloat32(),
  y: reader.deserializeFloat32(),
  rot: reader.deserializeFloat32(),
  health: reader.deserializeUInt32(),
  maxHealth: reader.deserializeUInt32(),
  mana: reader.deserializeUInt32(),
  level: reader.deserializeUInt32(),
  alive: reader.deserializeBoolean(),
})

const writeUpdateEntity = (writer, change) => {
  writer.serializeString(change.id)
  writer.serializeUInt32(
    (change.x === undefined ? 0 : 1) |
      (change.y === undefined ? 0 : 2) |
      (change.rot === undefined ? 0 : 4) |
      (change.vx === undefined ? 0 : 8) |
      (change.vy === undefined ? 0 : 16) |
      (change.health === undefined ? 0 : 32) |
      (change.mana === undefined ? 0 : 64) |
      (change.stance === undefined ? 0 : 128),
  )
  if (change.x !== undefined) writer.serializeFloat32(change.x)
  if (change.y !== undefined) writer.serializeFloat32(change.y)
  if (change.rot !== undefined) writer.serializeFloat32(change.rot)
  if (change.vx !== undefined) writer.serializeFloat32(change.vx)
  if (change.vy !== undefined) writer.serializeFloat32(change.vy)
  if (change.health !== undefined) writer.serializeUInt32(change.health)
  if (change.mana !== undefined) writer.serializeUInt32(change.mana)
  if (change.stance !== undefined) writer.serializeUInt32(STANCE_INDEX[change.stance])
}
const readUpdateEntity = reader => {
  const change = { id: reader.deserializeString() }
  const mask = reader.deserializeUInt32()
  if (mask & 1) change.x = reader.deserializeFloat32()
  if (mask & 2) change.y = reader.deserializeFloat32()
  if (mask & 4) change.rot = reader.deserializeFloat32()
  if (mask & 8) change.vx = reader.deserializeFloat32()
  if (mask & 16) change.vy = reader.deserializeFloat32()
  if (mask & 32) change.health = reader.deserializeUInt32()
  if (mask & 64) change.mana = reader.deserializeUInt32()
  if (mask & 128) change.stance = STANCES[reader.deserializeUInt32()]
  return change
}

const writeAction = (writer, action) => {
  writer.serializeString(action.ability)
  writer.serializeBoolean(action.target !== undefined)
  if (action.target !== undefined) writer.serializeString(action.target)
}
const readAction = reader => {
  const action = { ability: reader.deserializeString() }
  if (reader.deserializeBoolean()) action.target = reader.deserializeString()
  return action
}

const sessionOf = (write, read) => {
  const session = {
    encode: message => {
      ser.reset()
      write(message)
      return ser.getBuffer()
    },
    decode: data => {
      des.setBuffer(data)
      return read()
    },
  }
  return () => session
}

export const workloads = {
  snapshot: sessionOf(
    message => {
      writeTime(message.t)
      ser.serializeArray(message.entities, writeSnapshotEntity)
    },
    () => ({ t: readTime(), entities: des.deserializeArray(readSnapshotEntity) }),
  ),
  update: sessionOf(
    message => {
      writeTime(message.t)
      ser.serializeUInt32(message.ack)
      ser.serializeArray(message.updates, writeUpdateEntity)
    },
    () => ({ t: readTime(), ack: des.deserializeUInt32(), updates: des.deserializeArray(readUpdateEntity) }),
  ),
  input: sessionOf(
    message => {
      ser.serializeUInt32(message.seq)
      writeTime(message.t)
      ser.serializeFloat32(message.x)
      ser.serializeFloat32(message.y)
      ser.serializeFloat32(message.vx)
      ser.serializeFloat32(message.vy)
      ser.serializeFloat32(message.rot)
      ser.serializeString(message.zone)
      ser.serializeArray(message.actions, writeAction)
    },
    () => ({
      seq: des.deserializeUInt32(),
      t: readTime(),
      x: des.deserializeFloat32(),
      y: des.deserializeFloat32(),
      vx: des.deserializeFloat32(),
      vy: des.deserializeFloat32(),
      rot: des.deserializeFloat32(),
      zone: des.deserializeString(),
      actions: des.deserializeArray(readAction),
    }),
  ),
}
