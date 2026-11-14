import avro from 'avsc'

import { KINDS, STANCES } from '../workloads.mjs'

export const name = 'avsc'
export const pkg = 'avsc'
export const kind = 'schema'
export const notes =
  'Avro binary; optional fields are ["null", T] unions; t, ack and seq are long, the other ints are int'

const optional = (field, type) => ({ name: field, type: ['null', type], default: null })

const types = {
  snapshot: avro.Type.forSchema({
    type: 'record',
    name: 'Snapshot',
    fields: [
      { name: 't', type: 'long' },
      {
        name: 'entities',
        type: {
          type: 'array',
          items: {
            type: 'record',
            name: 'Entity',
            fields: [
              { name: 'id', type: 'string' },
              { name: 'name', type: 'string' },
              { name: 'kind', type: { type: 'enum', name: 'Kind', symbols: KINDS } },
              { name: 'x', type: 'float' },
              { name: 'y', type: 'float' },
              { name: 'rot', type: 'float' },
              { name: 'health', type: 'int' },
              { name: 'maxHealth', type: 'int' },
              { name: 'mana', type: 'int' },
              { name: 'level', type: 'int' },
              { name: 'alive', type: 'boolean' },
            ],
          },
        },
      },
    ],
  }),
  update: avro.Type.forSchema({
    type: 'record',
    name: 'Update',
    fields: [
      { name: 't', type: 'long' },
      { name: 'ack', type: 'long' },
      {
        name: 'updates',
        type: {
          type: 'array',
          items: {
            type: 'record',
            name: 'EntityUpdate',
            fields: [
              { name: 'id', type: 'string' },
              optional('x', 'float'),
              optional('y', 'float'),
              optional('rot', 'float'),
              optional('vx', 'float'),
              optional('vy', 'float'),
              optional('health', 'int'),
              optional('mana', 'int'),
              optional('stance', { type: 'enum', name: 'Stance', symbols: STANCES }),
            ],
          },
        },
      },
    ],
  }),
  input: avro.Type.forSchema({
    type: 'record',
    name: 'Input',
    fields: [
      { name: 'seq', type: 'long' },
      { name: 't', type: 'long' },
      { name: 'x', type: 'float' },
      { name: 'y', type: 'float' },
      { name: 'vx', type: 'float' },
      { name: 'vy', type: 'float' },
      { name: 'rot', type: 'float' },
      { name: 'zone', type: 'string' },
      {
        name: 'actions',
        type: {
          type: 'array',
          items: {
            type: 'record',
            name: 'Action',
            fields: [{ name: 'ability', type: 'string' }, optional('target', 'string')],
          },
        },
      },
    ],
  }),
}

const present = record => {
  const out = {}
  for (const key in record) if (record[key] !== null && typeof record[key] !== 'function') out[key] = record[key]
  return out
}

const views = {
  snapshot: decoded => ({ t: decoded.t, entities: decoded.entities.map(present) }),
  update: decoded => ({ t: decoded.t, ack: decoded.ack, updates: decoded.updates.map(present) }),
  input: decoded => ({ ...present(decoded), actions: decoded.actions.map(present) }),
}

const session = workload => {
  const type = types[workload]
  const state = {
    encode: message => type.toBuffer(message),
    decode: data => type.fromBuffer(data),
    view: views[workload],
  }
  return () => state
}

export const workloads = { snapshot: session('snapshot'), update: session('update'), input: session('input') }
