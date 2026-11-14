# Manapack

A binary codec for the messages of a real-time game. You describe each message once, as a schema checked against its
TypeScript type, and Manapack writes it with no field names and no type tags: a byte for the message type, the
required fields, a bit per optional field, then the optional fields that are there. A schema compiles to
straight-line code, and with a state per socket an id is spelled once and a clock is sent as a step from the last
one. It has no dependency, and the same code runs on a server and in a browser.

It was purpose-built for [Mana Blade](https://manablade.com), a low-poly multiplayer online RPG, so everything in it
is tested in a shipped game.

```bash
bun add manapack   # or npm / pnpm / yarn
```

```ts
import { channel, createWireState, delta, fixed, list, oneOf, optional, str, struct, sym, uint, union } from 'manapack'

type Action = { name: 'jump' } | { name: 'say'; text: string }
type Update = { id: string; x?: number; y?: number; health?: number; stance?: 'idle' | 'run'; actions?: Action[] }
type Message = { type: 'diff'; payload: { t: number; updates: Update[] } } | { type: 'beat' }

const action = union<Action, 'name'>('name', { jump: {}, say: { text: str() } })

const update = struct<Update>(
  {
    id: sym(),
    x: optional(fixed(512)),
    y: optional(fixed(512)),
    health: optional(uint),
    stance: optional(oneOf(['idle', 'run'])),
    actions: optional(list(action)),
  },
  { sparse: true },
)

const toClient = channel<Message>([['diff', struct({ t: delta(0), updates: list(update) })], ['beat']])

// one state per socket and per direction, made when the socket opens
const writer = createWireState()
const reader = createWireState()

const t = Date.now()
const first = toClient.encode(
  { type: 'diff', payload: { t, updates: [{ id: 'imp-4f2a', x: 31.4, health: 80 }] } },
  writer,
)
const next = toClient.encode({ type: 'diff', payload: { t: t + 50, updates: [{ id: 'imp-4f2a', x: 31.9 }] } }, writer)
// 23 bytes, then 8: the id is spelled once, the time is a step from the last one

toClient.decode(first, reader) // { type: 'diff', payload: { t, updates: [{ id: 'imp-4f2a', x: 31.400390625, health: 80, ... }] } }
```

A schema that does not match its type is a compile error: a field one of the two lacks, a required field declared
optional, a number where a string goes.

## Types

| Codec                     | Value                                                                   | Bytes                                                                                |
| ------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `num`                     | Any number: a whole one stays exact, a fraction keeps float32 precision | 1 for 0 to 27, 2 within ±8192, 4 as a float32, 5 or 9 for what a float32 cannot hold |
| `uint`                    | A whole number from 0 to 2^53                                           | 1 under 128, then 7 bits a byte                                                      |
| `byte`                    | A whole number from 0 to 255                                            | 1                                                                                    |
| `float`                   | A float32                                                               | 4                                                                                    |
| `fixed(steps)`            | A number rounded to `1 / steps` (a power of two)                        | 1 to 3 within a million steps of 0                                                   |
| `delta(slot)`             | A whole number that moves by small steps (a time, a sequence)           | The step from the socket's last value; the value itself with no state                |
| `bool`                    | A boolean                                                               | 1                                                                                    |
| `str()`                   | A string                                                                | Its length, then its UTF-8                                                           |
| `sym()`                   | A string that comes back (an id, a name)                                | Spelled once per socket, then 1                                                      |
| `oneOf(values)`           | One of a closed list of strings, numbers or booleans                    | 1                                                                                    |
| `nullable(codec)`         | A value or `null`                                                       | 1 more                                                                               |
| `list(codec)`             | An array                                                                | Its length, then its items                                                           |
| `record(codec)`           | An object of string keys                                                | Its size, then each key as a `sym` and its value                                     |
| `struct(fields, options)` | An object                                                               | A bit per optional field, then the fields that are there                             |
| `union(tag, variants)`    | Objects told apart by a tag field                                       | 1 for the variant, then its fields                                                   |
| `any()`                   | Whatever JSON takes, `undefined` included                               | Self-described, for a payload too rare to earn a schema                              |

`optional(codec)` marks a field of a struct or a variant that may be left out or `undefined`. A struct's first seven
optional fields share one mask byte, so put the ones most messages carry first.

`fixed` is for what its reader only draws: a position sent as `fixed(512)` is 3 bytes to 2 mm. Send what a receiver
computes with as `float` or `num`.

## Channels

`channel(entries)` is the messages of one direction of a socket. A message is `{ type, payload? }`, and a type takes
its index in `entries` as its byte: add new ones at the end.

- `encode(message, state?)` returns the bytes.
- `encodeShared(message, state?)` returns a view of a buffer the next write reuses, for a send that copies the bytes
  before it returns (`ws.send` does).
- `decode(bytes, state?)` returns the message, and throws on one cut short, one with bytes to spare or a type the
  channel does not have.
- `fingerprint` is a hash of the channel's schemas. Two builds decode each other only with the same one: send it in
  your handshake and refuse a peer that has another.

## State

With a state, a `sym` is spelled once and then is a number (256 at a time, the oldest renamed first), and a `delta`
is the step from the last value. The two ends must see the same messages in the same order, so:

- make one state per socket and per direction, on both ends, when the socket opens;
- use it only on an ordered, reliable transport (a WebSocket), and close the socket on a message that fails to
  decode.

With no state every string is spelled and every delta is its value, and any reader takes the message: use that for a
broadcast packed once for many sockets, and where a receiver may drop messages.

## Struct options

- `{ sparse: true }`: the objects come with few of their fields and in many shapes, as an update built field by
  field. The writer walks the keys an object has, where it would read every field of the schema.
- `{ exact: true }`: an object read has the fields it was sent and no other. Without it, an object read always has
  the first seven optional fields of its schema, `undefined` when they were left out, so that every object of a
  struct has one shape: test a decoded field against `undefined`, not with `in`.

## A value the schema refuses

A typed write that throws (a required field left `undefined`, a string where a number goes, a value a `oneOf` lacks)
is taken back from the socket's state, and the message goes self-described, with one `console.error` per reason. A
field the schema does not know is left out. A lie in a type does not cost a player the socket.

`setWireStrict(true)` throws on all three instead. Turn it on in tests and on bots: it is how the next lie is found.

## Compiled schemas

On its first message a channel compiles its schemas to straight-line code with `new Function`. Where a content
security policy forbids that, an interpreter runs the same schemas and gives the same bytes. `setWireCompiled(false)`
forces the interpreter, for a test of both.

## Limits

128 message types a channel, 256 named strings a socket at once, 32 levels in an `any()` value, 64 MB a message.
Module state makes a write or a read synchronous and not re-entrant, which is what a socket handler is.

## Performance

<!-- bench:start -->

How manapack compares with other ways to pack a state update, what a game server sends 20 times a second: 🟢
manapack is smaller or faster, 🔴 manapack is larger or slower, ⚪ within 5%. These are the best known formats,
the libraries made for games and the two closest ones. All 41 are in
[BENCH.md](https://github.com/verekia/manapack/blob/main/BENCH.md), with the sizes, the times and two more messages.

An update is 607 B without a state and 305 B with one.

Any reader, any order, against manapack without a state:

| library                              | size             | write, Node      | read, Node       | write, Bun       | read, Bun        |
| ------------------------------------ | ---------------- | ---------------- | ---------------- | ---------------- | ---------------- |
| JSON                                 | 🟢 3.25× smaller | 🟢 6.87× faster  | 🟢 7.98× faster  | 🟢 4.33× faster  | 🟢 3.88× faster  |
| msgpackr                             | 🟢 1.52× smaller | 🟢 2.29× faster  | 🟢 4.31× faster  | 🟢 3.95× faster  | 🟢 5.11× faster  |
| @msgpack/msgpack                     | 🟢 1.52× smaller | 🟢 3.08× faster  | 🟢 4.72× faster  | 🟢 4.64× faster  | 🟢 7.02× faster  |
| cbor-x                               | 🟢 1.52× smaller | 🟢 2.45× faster  | 🟢 4.55× faster  | 🟢 3.24× faster  | 🟢 5.65× faster  |
| protobufjs                           | 🟢 1.14× smaller | 🟢 2.35× faster  | 🟢 2.04× faster  | 🟢 3.09× faster  | 🟢 3.09× faster  |
| @bufbuild/protobuf                   | 🟢 1.14× smaller | 🟢 5.52× faster  | 🟢 4.68× faster  | 🟢 7.23× faster  | 🟢 6.55× faster  |
| avsc                                 | 🟢 1.14× smaller | 🟢 2.09× faster  | 🟢 2.13× faster  | 🟢 3.19× faster  | 🟢 3.96× faster  |
| flatbuffers (read in place)          | 🟢 1.62× smaller | 🟢 5.37× faster  | 🟢 2.55× faster  | 🟢 4.36× faster  | 🟢 2.35× faster  |
| bebop                                | 🟢 1.29× smaller | 🟢 2.03× faster  | 🟢 1.97× faster  | 🟢 2.26× faster  | 🟢 3.06× faster  |
| @apache-fory/core                    | 🟢 1.15× smaller | 🟢 1.43× faster  | 🟢 1.45× faster  | 🟢 1.76× faster  | 🟢 1.19× faster  |
| packcat                              | 🟢 1.14× smaller | 🟢 2.60× faster  | 🟢 1.94× faster  | 🟢 3.35× faster  | 🟢 2.08× faster  |
| @geckos.io/typed-array-buffer-schema | 🟢 1.12× smaller | 🟢 38.33× faster | 🟢 59.65× faster | 🟢 56.07× faster | 🟢 59.42× faster |
| tinybuf                              | 🟢 1.14× smaller | 🟢 4.76× faster  | 🟢 2.40× faster  | 🟢 3.42× faster  | 🟢 2.90× faster  |
| @hpx7/delta-pack                     | 🔴 1.03× larger  | 🟢 2.08× faster  | 🟢 2.66× faster  | 🟢 2.97× faster  | 🟢 3.22× faster  |
| @timeleap/sia                        | 🔴 1.02× larger  | ⚪ even          | ⚪ even          | 🔴 1.07× slower  | 🟢 1.88× faster  |
| sirdez                               | 🟢 1.14× smaller | ⚪ even          | ⚪ even          | 🟢 1.12× faster  | 🟢 1.19× faster  |

Messages read in order on one socket, against manapack with its socket state:

| library                     | size             | write, Node     | read, Node       | write, Bun      | read, Bun        |
| --------------------------- | ---------------- | --------------- | ---------------- | --------------- | ---------------- |
| msgpackr (records, float32) | 🟢 2.13× smaller | 🟢 2.77× faster | 🟢 3.86× faster  | 🟢 5.49× faster | 🟢 9.61× faster  |
| cbor-x (records, float32)   | 🟢 2.28× smaller | 🟢 3.05× faster | 🟢 4.09× faster  | 🟢 4.52× faster | 🟢 9.61× faster  |
| @colyseus/schema            | 🟢 1.17× smaller | 🟢 2.98× faster | 🟢 19.86× faster | 🟢 5.86× faster | 🟢 18.41× faster |

Node 22.23.4 and Bun 1.4.4, Intel Xeon Processor @ 2.10GHz, 4 cores, 2026-11-14. `bun run bench` runs it all again.

<!-- bench:end -->

## The demo

`example/` is a page where a server loop writes a state diff 20 times a second and a board draws what the reader
decoded, next to the size of the same message as JSON. Turn the per-socket state off, or send positions as floats,
and the sizes follow.

```bash
bun i && bun dev
```

## License

MIT
