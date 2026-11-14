import * as borsh from 'borsh'

import { KINDS, STANCES } from '../workloads.mjs'

export const name = 'borsh'
export const pkg = 'borsh'
export const kind = 'schema'
export const notes =
  'validate: false (the schema is not re-validated on every call); { option }; enums are unit-struct variants; t is u64'

const variants = labels => ({ enum: labels.map(label => ({ struct: { [label]: { struct: {} } } })) })
const variantOf = labels => Object.fromEntries(labels.map(label => [label, { [label]: {} }]))
const KIND_VARIANT = variantOf(KINDS)
const STANCE_VARIANT = variantOf(STANCES)

const schemas = {
  snapshot: {
    struct: {
      t: 'u64',
      entities: {
        array: {
          type: {
            struct: {
              id: 'string',
              name: 'string',
              kind: variants(KINDS),
              x: 'f32',
              y: 'f32',
              rot: 'f32',
              health: 'u16',
              maxHealth: 'u16',
              mana: 'u16',
              level: 'u8',
              alive: 'bool',
            },
          },
        },
      },
    },
  },
  update: {
    struct: {
      t: 'u64',
      ack: 'u32',
      updates: {
        array: {
          type: {
            struct: {
              id: 'string',
              x: { option: 'f32' },
              y: { option: 'f32' },
              rot: { option: 'f32' },
              vx: { option: 'f32' },
              vy: { option: 'f32' },
              health: { option: 'u16' },
              mana: { option: 'u16' },
              stance: { option: variants(STANCES) },
            },
          },
        },
      },
    },
  },
  input: {
    struct: {
      seq: 'u32',
      t: 'u64',
      x: 'f32',
      y: 'f32',
      vx: 'f32',
      vy: 'f32',
      rot: 'f32',
      zone: 'string',
      actions: { array: { type: { struct: { ability: 'string', target: { option: 'string' } } } } },
    },
  },
}

const toWire = {
  snapshot: message => ({
    t: message.t,
    entities: message.entities.map(entity => ({ ...entity, kind: KIND_VARIANT[entity.kind] })),
  }),
  update: message => ({
    t: message.t,
    ack: message.ack,
    updates: message.updates.map(entity =>
      entity.stance === undefined ? entity : { ...entity, stance: STANCE_VARIANT[entity.stance] },
    ),
  }),
  input: message => message,
}

const present = record => {
  const out = {}
  for (const key in record) if (record[key] !== null) out[key] = record[key]
  return out
}
const label = variant => Object.keys(variant)[0]

const views = {
  snapshot: decoded => ({
    t: Number(decoded.t),
    entities: decoded.entities.map(entity => ({ ...entity, kind: label(entity.kind) })),
  }),
  update: decoded => ({
    t: Number(decoded.t),
    ack: decoded.ack,
    updates: decoded.updates.map(entity =>
      entity.stance === null ? present(entity) : { ...present(entity), stance: label(entity.stance) },
    ),
  }),
  input: decoded => ({ ...decoded, t: Number(decoded.t), actions: decoded.actions.map(present) }),
}

const session = workload => {
  const schema = schemas[workload]
  const convert = toWire[workload]
  const state = {
    encode: message => borsh.serialize(schema, convert(message), false),
    decode: data => borsh.deserialize(schema, data, false),
    view: views[workload],
  }
  return () => state
}

export const workloads = { snapshot: session('snapshot'), update: session('update'), input: session('input') }
