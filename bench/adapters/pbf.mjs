import { PbfReader, PbfWriter } from 'pbf'

import { KINDS, STANCES } from '../workloads.mjs'

export const name = 'pbf'
export const pkg = 'pbf'
export const kind = 'schema'
export const notes =
  'hand-written protobuf readers and writers; a writer over one pre-allocated buffer, copied out; t is a varint'

const indexOf = labels => Object.fromEntries(labels.map((label, i) => [label, i]))
const KIND_INDEX = indexOf(KINDS)
const STANCE_INDEX = indexOf(STANCES)

const readEntity = (pbf, end) => {
  const obj = {
    id: '',
    name: '',
    kind: KINDS[0],
    x: 0,
    y: 0,
    rot: 0,
    health: 0,
    maxHealth: 0,
    mana: 0,
    level: 0,
    alive: false,
  }
  let field
  while ((field = pbf.nextField(end))) {
    if (field === 1) obj.id = pbf.readString()
    else if (field === 2) obj.name = pbf.readString()
    else if (field === 3) obj.kind = KINDS[pbf.readVarint()]
    else if (field === 4) obj.x = pbf.readFloat()
    else if (field === 5) obj.y = pbf.readFloat()
    else if (field === 6) obj.rot = pbf.readFloat()
    else if (field === 7) obj.health = pbf.readVarint()
    else if (field === 8) obj.maxHealth = pbf.readVarint()
    else if (field === 9) obj.mana = pbf.readVarint()
    else if (field === 10) obj.level = pbf.readVarint()
    else if (field === 11) obj.alive = pbf.readBoolean()
  }
  return obj
}
const writeEntity = (obj, pbf) => {
  const kindIndex = KIND_INDEX[obj.kind]
  if (obj.id) pbf.writeStringField(1, obj.id)
  if (obj.name) pbf.writeStringField(2, obj.name)
  if (kindIndex) pbf.writeVarintField(3, kindIndex)
  if (obj.x) pbf.writeFloatField(4, obj.x)
  if (obj.y) pbf.writeFloatField(5, obj.y)
  if (obj.rot) pbf.writeFloatField(6, obj.rot)
  if (obj.health) pbf.writeVarintField(7, obj.health)
  if (obj.maxHealth) pbf.writeVarintField(8, obj.maxHealth)
  if (obj.mana) pbf.writeVarintField(9, obj.mana)
  if (obj.level) pbf.writeVarintField(10, obj.level)
  if (obj.alive) pbf.writeBooleanField(11, obj.alive)
}

const readSnapshot = (pbf, end) => {
  const obj = { t: 0, entities: [] }
  let field
  while ((field = pbf.nextField(end))) {
    if (field === 1) obj.t = pbf.readVarint()
    else if (field === 2) obj.entities.push(readEntity(pbf, pbf.readVarint() + pbf.pos))
  }
  return obj
}
const writeSnapshot = (obj, pbf) => {
  if (obj.t) pbf.writeVarintField(1, obj.t)
  for (const item of obj.entities) pbf.writeMessage(2, writeEntity, item)
}

const readEntityUpdate = (pbf, end) => {
  const obj = { id: '' }
  let field
  while ((field = pbf.nextField(end))) {
    if (field === 1) obj.id = pbf.readString()
    else if (field === 2) obj.x = pbf.readFloat()
    else if (field === 3) obj.y = pbf.readFloat()
    else if (field === 4) obj.rot = pbf.readFloat()
    else if (field === 5) obj.vx = pbf.readFloat()
    else if (field === 6) obj.vy = pbf.readFloat()
    else if (field === 7) obj.health = pbf.readVarint()
    else if (field === 8) obj.mana = pbf.readVarint()
    else if (field === 9) obj.stance = STANCES[pbf.readVarint()]
  }
  return obj
}
const writeEntityUpdate = (obj, pbf) => {
  if (obj.id) pbf.writeStringField(1, obj.id)
  if (obj.x !== undefined) pbf.writeFloatField(2, obj.x)
  if (obj.y !== undefined) pbf.writeFloatField(3, obj.y)
  if (obj.rot !== undefined) pbf.writeFloatField(4, obj.rot)
  if (obj.vx !== undefined) pbf.writeFloatField(5, obj.vx)
  if (obj.vy !== undefined) pbf.writeFloatField(6, obj.vy)
  if (obj.health !== undefined) pbf.writeVarintField(7, obj.health)
  if (obj.mana !== undefined) pbf.writeVarintField(8, obj.mana)
  if (obj.stance !== undefined) pbf.writeVarintField(9, STANCE_INDEX[obj.stance])
}

const readUpdate = (pbf, end) => {
  const obj = { t: 0, ack: 0, updates: [] }
  let field
  while ((field = pbf.nextField(end))) {
    if (field === 1) obj.t = pbf.readVarint()
    else if (field === 2) obj.ack = pbf.readVarint()
    else if (field === 3) obj.updates.push(readEntityUpdate(pbf, pbf.readVarint() + pbf.pos))
  }
  return obj
}
const writeUpdate = (obj, pbf) => {
  if (obj.t) pbf.writeVarintField(1, obj.t)
  if (obj.ack) pbf.writeVarintField(2, obj.ack)
  for (const item of obj.updates) pbf.writeMessage(3, writeEntityUpdate, item)
}

const readAction = (pbf, end) => {
  const obj = { ability: '' }
  let field
  while ((field = pbf.nextField(end))) {
    if (field === 1) obj.ability = pbf.readString()
    else if (field === 2) obj.target = pbf.readString()
  }
  return obj
}
const writeAction = (obj, pbf) => {
  if (obj.ability) pbf.writeStringField(1, obj.ability)
  if (obj.target !== undefined) pbf.writeStringField(2, obj.target)
}

const readInput = (pbf, end) => {
  const obj = { seq: 0, t: 0, x: 0, y: 0, vx: 0, vy: 0, rot: 0, zone: '', actions: [] }
  let field
  while ((field = pbf.nextField(end))) {
    if (field === 1) obj.seq = pbf.readVarint()
    else if (field === 2) obj.t = pbf.readVarint()
    else if (field === 3) obj.x = pbf.readFloat()
    else if (field === 4) obj.y = pbf.readFloat()
    else if (field === 5) obj.vx = pbf.readFloat()
    else if (field === 6) obj.vy = pbf.readFloat()
    else if (field === 7) obj.rot = pbf.readFloat()
    else if (field === 8) obj.zone = pbf.readString()
    else if (field === 9) obj.actions.push(readAction(pbf, pbf.readVarint() + pbf.pos))
  }
  return obj
}
const writeInput = (obj, pbf) => {
  if (obj.seq) pbf.writeVarintField(1, obj.seq)
  if (obj.t) pbf.writeVarintField(2, obj.t)
  if (obj.x) pbf.writeFloatField(3, obj.x)
  if (obj.y) pbf.writeFloatField(4, obj.y)
  if (obj.vx) pbf.writeFloatField(5, obj.vx)
  if (obj.vy) pbf.writeFloatField(6, obj.vy)
  if (obj.rot) pbf.writeFloatField(7, obj.rot)
  if (obj.zone) pbf.writeStringField(8, obj.zone)
  for (const item of obj.actions) pbf.writeMessage(9, writeAction, item)
}

const scratch = new Uint8Array(65536)

const session = (read, write) => {
  const state = {
    encode: message => {
      const pbf = new PbfWriter(scratch)
      write(message, pbf)
      return pbf.finish().slice()
    },
    decode: data => read(new PbfReader(data)),
  }
  return () => state
}

export const workloads = {
  snapshot: session(readSnapshot, writeSnapshot),
  update: session(readUpdate, writeUpdate),
  input: session(readInput, writeInput),
}
