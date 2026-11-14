import { Decoder, Encoder, schema, t } from '@colyseus/schema'

import { KINDS, same, STANCES, workloads as messages } from '../workloads.mjs'

export const name = '@colyseus/schema'
export const pkg = '@colyseus/schema'
export const kind = 'schema'
export const stateful = true
export const notes =
  'schema() form. snapshot: set 32 entities, encodeAll, read into a fresh state. update: set the changed fields ' +
  'of a map keyed by id, encode, discardChanges: an id travels once and a field set to the value it had is not ' +
  'sent, so the check compares the whole reader state with the messages so far. Enums as uint8, t as uint64, ' +
  'no input (not a state)'

const KIND_INDEX = Object.fromEntries(KINDS.map((value, i) => [value, i]))
const STANCE_INDEX = Object.fromEntries(STANCES.map((value, i) => [value, i]))

const SnapshotEntity = schema(
  {
    id: t.string(),
    name: t.string(),
    kind: t.uint8(),
    x: t.float32(),
    y: t.float32(),
    rot: t.float32(),
    health: t.uint16(),
    maxHealth: t.uint16(),
    mana: t.uint16(),
    level: t.uint8(),
    alive: t.boolean(),
  },
  'SnapshotEntity',
)
const SnapshotState = schema({ t: t.uint64(), entities: t.array(SnapshotEntity) }, 'SnapshotState')

const UpdateEntity = schema(
  {
    x: t.float32(),
    y: t.float32(),
    rot: t.float32(),
    vx: t.float32(),
    vy: t.float32(),
    health: t.uint16(),
    mana: t.uint16(),
    stance: t.uint8(),
  },
  'UpdateEntity',
)
const UpdateState = schema({ t: t.uint64(), ack: t.uint32(), entities: t.map(UpdateEntity) }, 'UpdateState')

const snapshot = () => {
  const state = new SnapshotState()
  const encoder = new Encoder(state)
  const slots = []
  return {
    encode: message => {
      const { entities } = message
      while (slots.length < entities.length) {
        const slot = new SnapshotEntity()
        slots.push(slot)
        state.entities.push(slot)
      }
      while (slots.length > entities.length) {
        slots.pop()
        state.entities.pop()
      }
      state.t = message.t
      for (let i = 0; i < entities.length; i++) {
        const entity = entities[i]
        const slot = slots[i]
        slot.id = entity.id
        slot.name = entity.name
        slot.kind = KIND_INDEX[entity.kind]
        slot.x = entity.x
        slot.y = entity.y
        slot.rot = entity.rot
        slot.health = entity.health
        slot.maxHealth = entity.maxHealth
        slot.mana = entity.mana
        slot.level = entity.level
        slot.alive = entity.alive
      }
      const bytes = encoder.encodeAll().slice()
      encoder.discardChanges()
      return bytes
    },
    decode: data => {
      const mirror = new SnapshotState()
      new Decoder(mirror).decode(data)
      return mirror
    },
    view: mirror => ({
      t: mirror.t,
      entities: mirror.entities.map(entity => ({
        id: entity.id,
        name: entity.name,
        kind: KINDS[entity.kind],
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
  }
}

const UPDATE_FIELDS = ['x', 'y', 'rot', 'vx', 'vy', 'health', 'mana', 'stance']

const update = () => {
  const state = new UpdateState()
  const encoder = new Encoder(state)
  const mirror = new UpdateState()
  const decoder = new Decoder(mirror)
  const expected = { t: undefined, ack: undefined, entities: {} }
  let read = 0
  return {
    encode: message => {
      const { updates } = message
      state.t = message.t
      state.ack = message.ack
      for (let i = 0; i < updates.length; i++) {
        const change = updates[i]
        let entity = state.entities.get(change.id)
        if (entity === undefined) {
          entity = new UpdateEntity()
          state.entities.set(change.id, entity)
        }
        if (change.x !== undefined) entity.x = change.x
        if (change.y !== undefined) entity.y = change.y
        if (change.rot !== undefined) entity.rot = change.rot
        if (change.vx !== undefined) entity.vx = change.vx
        if (change.vy !== undefined) entity.vy = change.vy
        if (change.health !== undefined) entity.health = change.health
        if (change.mana !== undefined) entity.mana = change.mana
        if (change.stance !== undefined) entity.stance = STANCE_INDEX[change.stance]
      }
      const bytes = encoder.encode().slice()
      encoder.discardChanges()
      return bytes
    },
    decode: data => {
      decoder.decode(data)
      return mirror
    },
    // A patch does not give its message back: the whole reader state is compared, then the message returned
    view: decoded => {
      const message = messages.update[read++]
      expected.t = message.t
      expected.ack = message.ack
      for (const { id, ...change } of message.updates) Object.assign((expected.entities[id] ??= {}), change)
      const entities = {}
      decoded.entities.forEach((entity, id) => {
        entities[id] = Object.fromEntries(
          UPDATE_FIELDS.map(field => [field, field === 'stance' ? STANCES[entity.stance] : entity[field]]),
        )
      })
      const difference = same({ t: decoded.t, ack: decoded.ack, entities }, expected, 'state')
      return difference ? { difference } : message
    },
  }
}

export const workloads = { snapshot, update }
