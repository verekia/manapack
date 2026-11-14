import protobuf from 'protobufjs'

import { KINDS, STANCES } from '../workloads.mjs'

export const name = 'protobufjs'
export const pkg = 'protobufjs'
export const kind = 'schema'
export const notes =
  'reflection from a parsed .proto; enum names mapped by hand, not fromObject; proto3 optional; t is uint64 (a Long)'

const proto = `
syntax = "proto3";
package bench;

enum Kind { ${KINDS.map((label, i) => `${label} = ${i};`).join(' ')} }
enum Stance { ${STANCES.map((label, i) => `${label} = ${i};`).join(' ')} }

message Entity {
  string id = 1;
  string name = 2;
  Kind kind = 3;
  float x = 4;
  float y = 5;
  float rot = 6;
  uint32 health = 7;
  uint32 maxHealth = 8;
  uint32 mana = 9;
  uint32 level = 10;
  bool alive = 11;
}
message Snapshot {
  uint64 t = 1;
  repeated Entity entities = 2;
}

message EntityUpdate {
  string id = 1;
  optional float x = 2;
  optional float y = 3;
  optional float rot = 4;
  optional float vx = 5;
  optional float vy = 6;
  optional uint32 health = 7;
  optional uint32 mana = 8;
  optional Stance stance = 9;
}
message Update {
  uint64 t = 1;
  uint32 ack = 2;
  repeated EntityUpdate updates = 3;
}

message Action {
  string ability = 1;
  optional string target = 2;
}
message Input {
  uint32 seq = 1;
  uint64 t = 2;
  float x = 3;
  float y = 4;
  float vx = 5;
  float vy = 6;
  float rot = 7;
  string zone = 8;
  repeated Action actions = 9;
}
`

const { root } = protobuf.parse(proto, { keepCase: true })
const kindNumber = root.lookupEnum('bench.Kind').values
const stanceNumber = root.lookupEnum('bench.Stance').values
const plain = { enums: String, longs: Number, defaults: true }

const valid = {
  Snapshot: message => ({
    t: message.t,
    entities: message.entities.map(entity => ({ ...entity, kind: kindNumber[entity.kind] })),
  }),
  Update: message => ({
    t: message.t,
    ack: message.ack,
    updates: message.updates.map(entity =>
      entity.stance === undefined ? entity : { ...entity, stance: stanceNumber[entity.stance] },
    ),
  }),
  Input: message => message,
}

const session = typeName => {
  const type = root.lookupType(`bench.${typeName}`)
  const convert = valid[typeName]
  const state = {
    encode: message => type.encode(convert(message)).finish(),
    decode: data => type.decode(data),
    view: decoded => type.toObject(decoded, plain),
  }
  return () => state
}

export const workloads = { snapshot: session('Snapshot'), update: session('Update'), input: session('Input') }
