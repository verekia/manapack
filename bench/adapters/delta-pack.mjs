import {
  ArrayType,
  BooleanType,
  EnumType,
  FloatType,
  IntType,
  load,
  ObjectType,
  OptionalType,
  ReferenceType,
  StringType,
  UIntType,
} from '@hpx7/delta-pack'

import { KINDS, STANCES } from '../workloads.mjs'

export const name = '@hpx7/delta-pack'
export const pkg = '@hpx7/delta-pack'
export const kind = 'schema'
export const notes =
  'interpreter mode: load(schema).encode/decode of whole messages (no SyncSession diffs); optional fields, ' +
  'bools, enums and level are bits; t and the other integers as varints'

const Kind = EnumType('Kind', KINDS)
const Stance = EnumType('Stance', STANCES)

const SnapshotEntity = ObjectType('SnapshotEntity', {
  id: StringType(),
  name: StringType(),
  kind: ReferenceType(Kind),
  x: FloatType(),
  y: FloatType(),
  rot: FloatType(),
  health: UIntType(),
  maxHealth: UIntType(),
  mana: UIntType(),
  level: IntType({ min: 0, max: 255 }),
  alive: BooleanType(),
})
const Snapshot = ObjectType('Snapshot', { t: UIntType(), entities: ArrayType(ReferenceType(SnapshotEntity)) })

const UpdateEntity = ObjectType('UpdateEntity', {
  id: StringType(),
  x: OptionalType(FloatType()),
  y: OptionalType(FloatType()),
  rot: OptionalType(FloatType()),
  vx: OptionalType(FloatType()),
  vy: OptionalType(FloatType()),
  health: OptionalType(UIntType()),
  mana: OptionalType(UIntType()),
  stance: OptionalType(ReferenceType(Stance)),
})
const Update = ObjectType('Update', {
  t: UIntType(),
  ack: UIntType(),
  updates: ArrayType(ReferenceType(UpdateEntity)),
})

const Action = ObjectType('Action', { ability: StringType(), target: OptionalType(StringType()) })
const Input = ObjectType('Input', {
  seq: UIntType(),
  t: UIntType(),
  x: FloatType(),
  y: FloatType(),
  vx: FloatType(),
  vy: FloatType(),
  rot: FloatType(),
  zone: StringType(),
  actions: ArrayType(ReferenceType(Action)),
})

const sessionOf = schema => {
  const api = load(schema)
  const session = { encode: message => api.encode(message), decode: data => api.decode(data) }
  return () => session
}

export const workloads = { snapshot: sessionOf(Snapshot), update: sessionOf(Update), input: sessionOf(Input) }
