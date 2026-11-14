import { create, createFileRegistry, fromBinary, toBinary } from '@bufbuild/protobuf'
import {
  FieldDescriptorProto_Label as Label,
  FieldDescriptorProto_Type as Type,
  FileDescriptorProtoSchema,
} from '@bufbuild/protobuf/wkt'

import { KINDS, STANCES } from '../workloads.mjs'

export const name = '@bufbuild/protobuf'
export const pkg = '@bufbuild/protobuf'
export const kind = 'schema'
export const notes =
  'hand-built FileDescriptorProto, no protoc; create() then toBinary; proto3 optional; t is uint64 (BigInt)'

const enumType = (enumName, labels) => ({
  name: enumName,
  value: labels.map((label, number) => ({ name: label, number })),
})
const messageType = (messageName, fields) => ({
  name: messageName,
  field: Object.entries(fields).map(([fieldName, [type, typeName, flag]], i) => ({
    name: fieldName,
    jsonName: fieldName,
    number: i + 1,
    type,
    typeName,
    label: flag === 'repeated' ? Label.REPEATED : Label.OPTIONAL,
    proto3Optional: flag === 'optional',
  })),
})

const float = [Type.FLOAT]
const uint32 = [Type.UINT32]
const uint64 = [Type.UINT64]
const string = [Type.STRING]
const optional = ([type, typeName]) => [type, typeName, 'optional']
const repeated = messageName => [Type.MESSAGE, `.bench.${messageName}`, 'repeated']

const registry = createFileRegistry(
  create(FileDescriptorProtoSchema, {
    name: 'bench.proto',
    package: 'bench',
    syntax: 'proto3',
    enumType: [enumType('Kind', KINDS), enumType('Stance', STANCES)],
    messageType: [
      messageType('Entity', {
        id: string,
        name: string,
        kind: [Type.ENUM, '.bench.Kind'],
        x: float,
        y: float,
        rot: float,
        health: uint32,
        maxHealth: uint32,
        mana: uint32,
        level: uint32,
        alive: [Type.BOOL],
      }),
      messageType('Snapshot', { t: uint64, entities: repeated('Entity') }),
      messageType('EntityUpdate', {
        id: string,
        x: optional(float),
        y: optional(float),
        rot: optional(float),
        vx: optional(float),
        vy: optional(float),
        health: optional(uint32),
        mana: optional(uint32),
        stance: optional([Type.ENUM, '.bench.Stance']),
      }),
      messageType('Update', { t: uint64, ack: uint32, updates: repeated('EntityUpdate') }),
      messageType('Action', { ability: string, target: optional(string) }),
      messageType('Input', {
        seq: uint32,
        t: uint64,
        x: float,
        y: float,
        vx: float,
        vy: float,
        rot: float,
        zone: string,
        actions: repeated('Action'),
      }),
    ],
  }),
  () => undefined,
)

const SnapshotSchema = registry.getMessage('bench.Snapshot')
const UpdateSchema = registry.getMessage('bench.Update')
const InputSchema = registry.getMessage('bench.Input')

const indexOf = labels => Object.fromEntries(labels.map((label, i) => [label, i]))
const KIND_INDEX = indexOf(KINDS)
const STANCE_INDEX = indexOf(STANCES)

const entityInit = entity => ({ ...entity, kind: KIND_INDEX[entity.kind] })
const updateInit = update => (update.stance === undefined ? update : { ...update, stance: STANCE_INDEX[update.stance] })

const strip = ({ $typeName, $unknown, ...fields }) => fields

const snapshot = {
  encode: message =>
    toBinary(
      SnapshotSchema,
      create(SnapshotSchema, { t: BigInt(message.t), entities: message.entities.map(entityInit) }),
    ),
  decode: data => fromBinary(SnapshotSchema, data),
  view: decoded => ({
    t: Number(decoded.t),
    entities: decoded.entities.map(entity => ({ ...strip(entity), kind: KINDS[entity.kind] })),
  }),
}

const update = {
  encode: message =>
    toBinary(
      UpdateSchema,
      create(UpdateSchema, { t: BigInt(message.t), ack: message.ack, updates: message.updates.map(updateInit) }),
    ),
  decode: data => fromBinary(UpdateSchema, data),
  view: decoded => ({
    t: Number(decoded.t),
    ack: decoded.ack,
    updates: decoded.updates.map(entity =>
      entity.stance === undefined ? strip(entity) : { ...strip(entity), stance: STANCES[entity.stance] },
    ),
  }),
}

const input = {
  encode: message => toBinary(InputSchema, create(InputSchema, { ...message, t: BigInt(message.t) })),
  decode: data => fromBinary(InputSchema, data),
  view: decoded => ({ ...strip(decoded), t: Number(decoded.t), actions: decoded.actions.map(strip) }),
}

export const workloads = { snapshot: () => snapshot, update: () => update, input: () => input }
