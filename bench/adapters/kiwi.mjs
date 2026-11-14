import { compileSchema, parseSchema } from 'kiwi-schema'

import { KINDS, STANCES } from '../workloads.mjs'

export const name = 'kiwi-schema'
export const pkg = 'kiwi-schema'
export const kind = 'schema'
export const notes =
  'compileSchema at run time; structs, and messages (field ids) where a field can be absent; t is uint64 (BigInt)'

const schema = compileSchema(
  parseSchema(`
enum Kind { ${KINDS.map((label, i) => `${label} = ${i};`).join(' ')} }
enum Stance { ${STANCES.map((label, i) => `${label} = ${i};`).join(' ')} }

struct Entity {
  string id;
  string name;
  Kind kind;
  float x;
  float y;
  float rot;
  uint health;
  uint maxHealth;
  uint mana;
  byte level;
  bool alive;
}
struct Snapshot {
  uint64 t;
  Entity[] entities;
}

message EntityUpdate {
  string id = 1;
  float x = 2;
  float y = 3;
  float rot = 4;
  float vx = 5;
  float vy = 6;
  uint health = 7;
  uint mana = 8;
  Stance stance = 9;
}
struct Update {
  uint64 t;
  uint ack;
  EntityUpdate[] updates;
}

message Action {
  string ability = 1;
  string target = 2;
}
struct Input {
  uint seq;
  uint64 t;
  float x;
  float y;
  float vx;
  float vy;
  float rot;
  string zone;
  Action[] actions;
}
`),
)

const view = decoded => ({ ...decoded, t: Number(decoded.t) })

const snapshot = {
  encode: message => schema.encodeSnapshot({ t: BigInt(message.t), entities: message.entities }),
  decode: data => schema.decodeSnapshot(data),
  view,
}
const update = {
  encode: message => schema.encodeUpdate({ t: BigInt(message.t), ack: message.ack, updates: message.updates }),
  decode: data => schema.decodeUpdate(data),
  view,
}
const input = {
  encode: message => schema.encodeInput({ ...message, t: BigInt(message.t) }),
  decode: data => schema.decodeInput(data),
  view,
}

export const workloads = { snapshot: () => snapshot, update: () => update, input: () => input }
