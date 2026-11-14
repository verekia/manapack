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

## The demo

`example/` is a page where a server loop writes a state diff 20 times a second and a board draws what the reader
decoded, next to the size of the same message as JSON. Turn the per-socket state off, or send positions as floats,
and the sizes follow.

```bash
bun i && bun dev
```

## License

MIT
