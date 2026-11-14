import { afterEach, describe, expect, test } from 'bun:test'

import {
  any,
  bool,
  byte,
  channel,
  createWireState,
  delta,
  fixed,
  float,
  list,
  nullable,
  num,
  oneOf,
  optional,
  record,
  setWireCompiled,
  setWireStrict,
  str,
  struct,
  sym,
  uint,
  union,
} from '../index'

import type { Codec } from '../index'

afterEach(() => setWireStrict(false))

// mulberry32
const createRandom = (seed: number) => {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const lone = <T>(codec: Codec<T>) => channel<{ type: 'm'; payload: T }>([['m', codec]])
const pack = <T>(codec: Codec<T>, value: T) => lone(codec).encode({ type: 'm', payload: value })
const over = <T>(codec: Codec<T>, value: T) => lone(codec).decode(pack(codec, value)).payload
// the payload's bytes, without the message type
const size = <T>(codec: Codec<T>, value: T) => pack(codec, value).length - 1

describe('numbers', () => {
  test('an integer comes back exact, whatever its size', () => {
    const integers = [
      0,
      1,
      27,
      28,
      255,
      8191,
      8192,
      -1,
      -8192,
      -8193,
      65_536,
      2 ** 24,
      2 ** 24 + 1,
      2 ** 31,
      -(2 ** 31),
    ]
    for (const n of [...integers, Date.UTC(2026, 0, 1), Number.MAX_SAFE_INTEGER, -Number.MAX_SAFE_INTEGER])
      expect(over(num, n)).toBe(n)
  })

  test('a fraction comes back as its float32', () => {
    for (const n of [0.1, -77.123456789, 3.3333333, 1e-7, 123456.789, 2.0943951023931953, -1e-12])
      expect(over(num, n)).toBe(Math.fround(n))
  })

  test('a fraction whose float32 is a whole number costs what that number costs', () => {
    expect(over(num, 100.0000001)).toBe(100)
    expect(size(num, 100.0000001)).toBe(2)
    expect(size(num, 1e-60)).toBe(1)
    expect(size(num, -5.00000001)).toBe(2)
    expect(over(num, 9000.0000001)).toBe(9000)
    expect(size(num, 9000.0000001)).toBe(4)
  })

  test('a float is its four bytes, whatever it holds', () => {
    for (const n of [0, 1, -1, 77.5, 0.1, -123456.789, 1e-30, 1e30, Infinity]) {
      expect(over(float, n)).toBe(Math.fround(n))
      expect(size(float, n)).toBe(4)
    }
    expect(over(float, Number.NaN)).toBeNaN()
    setWireStrict(true)
    expect(() => pack(float, '5' as never)).toThrow()
  })

  test('small integers take 1 byte, the ones within ±8192 take 2, a float 4', () => {
    expect(size(num, 0)).toBe(1)
    expect(size(num, 27)).toBe(1)
    expect(size(num, 28)).toBe(2)
    expect(size(num, 8191)).toBe(2)
    expect(size(num, -8192)).toBe(2)
    expect(size(num, 8192)).toBe(4)
    expect(size(num, 77.5)).toBe(4)
    expect(size(num, Date.UTC(2026, 0, 1))).toBe(9)
  })

  test('the values outside the range of a game number still come back', () => {
    for (const n of [1e-30, -1e-30, 1e-45, Infinity, -Infinity]) expect(over(num, n)).toBe(Math.fround(n))
    for (const n of [1e30, -1e30, Math.fround(1e30), -Math.fround(5e18)]) expect(over(num, n)).toBe(n)
    expect(size(num, Math.fround(1e30))).toBe(5)
    expect(size(num, 1e-30)).toBe(5)
    expect(over(num, Number.NaN)).toBeNaN()
    expect(over(num, 1e-60)).toBe(0)
    expect(Object.is(over(num, -0), 0)).toBe(true)
  })

  test('what is not a number is refused', () => {
    setWireStrict(true)
    for (const value of ['5', null, undefined, true, {}]) expect(() => pack(num, value as never)).toThrow()
  })

  test('a byte is a whole number from 0 to 255 and nothing else', () => {
    for (const n of [0, 1, 127, 128, 255]) {
      expect(over(byte, n)).toBe(n)
      expect(size(byte, n)).toBe(1)
    }
    setWireStrict(true)
    for (const value of [-1, 256, 0.5, Number.NaN, '7']) expect(() => pack(byte, value as never)).toThrow()
  })

  test('a fixed number comes back to the nearest step, in 1 to 3 bytes within a million steps of 0', () => {
    const metres = fixed(512)
    for (const value of [0, 1 / 512, -1 / 512, 63 / 512, 12.5, -37.25, 2047.998046875, -2048, 2048, -90_000.5, 1e9])
      expect(over(metres, value)).toBe(value)
    for (const value of [0.001, 3.14159, -417.3331, 1999.9999, 123_456.789]) {
      const read = over(metres, value)
      expect(read * 512).toBe(Math.round(value * 512))
      expect(Math.abs(read - value)).toBeLessThanOrEqual(1 / 1024)
    }
    expect(Object.is(over(metres, -0.0001), 0)).toBe(true)
    expect([0, 0.12, -0.125, 0.126, 15.99, 16, -2048, 2047.99, 2048, 100_000].map(v => size(metres, v))).toEqual([
      1, 1, 1, 2, 2, 3, 3, 3, 4, 4,
    ])
    expect(size(fixed(1024), Math.PI)).toBe(2)
    expect(size(fixed(256), -7.5)).toBe(2)
    expect(() => fixed(100)).toThrow()
    setWireStrict(true)
    for (const value of [Number.NaN, Infinity, -Infinity, 1e300, '5', null, undefined])
      expect(() => pack(metres, value as never)).toThrow()
  })

  test('an unsigned integer takes a byte under 128 and comes back exact up to 2^53', () => {
    for (const n of [0, 127, 128, 16_383, 16_384, 2 ** 32 - 1, 2 ** 32, Date.UTC(2026, 0, 1), Number.MAX_SAFE_INTEGER])
      expect(over(uint, n)).toBe(n)
    expect(size(uint, 127)).toBe(1)
    expect(size(uint, 128)).toBe(2)
    setWireStrict(true)
    for (const value of [-1, 0.5, Number.NaN, Infinity, 2 ** 60]) expect(() => pack(uint, value)).toThrow()
  })
})

describe('strings', () => {
  test('come back whatever they hold', () => {
    for (const s of [
      '',
      'a',
      'kV3xPq9LmT2aZr8WnB5c',
      'héllo wörld',
      '日本語のテキスト',
      '🗡️ mana ⚔️',
      'x'.repeat(70_000),
    ])
      expect(over(str(), s)).toBe(s)
    expect(over(str(), 'é'.repeat(100))).toBe('é'.repeat(100))
  })

  test('a named string is spelled once per socket, then is a byte', () => {
    const wire = lone(list(sym()))
    const writer = createWireState()
    const reader = createWireState()
    const id = 'kV3xPq9LmT2aZr8WnB5c'
    const first = wire.encode({ type: 'm', payload: [id, 'other', id] }, writer)
    const second = wire.encode({ type: 'm', payload: [id] }, writer)
    expect(first.length).toBe(1 + 1 + (2 + id.length) + (2 + 5) + 1)
    expect(second.length).toBe(1 + 1 + 1)
    expect(wire.decode(first, reader).payload).toEqual([id, 'other', id])
    expect(wire.decode(second, reader).payload).toEqual([id])
  })

  test('a socket that names more strings than it keeps gives the oldest numbers away, on both ends alike', () => {
    const wire = lone(list(sym()))
    const writer = createWireState()
    const reader = createWireState()
    const random = createRandom(7)
    for (let message = 0; message < 400; message++) {
      const ids = Array.from({ length: 1 + Math.floor(random() * 12) }, () => `id-${Math.floor(random() ** 2 * 900)}`)
      expect(wire.decode(wire.encode({ type: 'm', payload: ids }, writer), reader).payload).toEqual(ids)
    }
  })

  test('with no state a named string is spelled every time, and any reader takes it', () => {
    const wire = lone(list(sym()))
    const packed = wire.encode({ type: 'm', payload: ['abc', 'abc'] })
    expect(packed.length).toBe(1 + 1 + 2 * (2 + 3))
    expect(wire.decode(packed).payload).toEqual(['abc', 'abc'])
    expect(wire.decode(packed, createWireState()).payload).toEqual(['abc', 'abc'])
  })

  test('a string spelled again and again is read right each time, one of its length and ends too', () => {
    const wire = lone(list(sym()))
    const random = createRandom(5)
    const pool = [
      'bG7tP',
      'bG7tQ',
      'cG7tP',
      'bGxtP',
      'x',
      '',
      'é',
      'zoné',
      'a'.repeat(32),
      'a'.repeat(33),
      'kV3xPq9LmT2aZr8WnB5c',
    ]
    for (let round = 0; round < 500; round++) {
      const ids = Array.from({ length: 1 + Math.floor(random() * 8) }, () => pool[Math.floor(random() * pool.length)]!)
      expect(wire.decode(wire.encode({ type: 'm', payload: ids })).payload).toEqual(ids)
    }
  })

  test('a reader with no state refuses a string by its number', () => {
    const wire = lone(sym())
    const writer = createWireState()
    wire.encode({ type: 'm', payload: 'abc' }, writer)
    expect(() => wire.decode(wire.encode({ type: 'm', payload: 'abc' }, writer))).toThrow()
  })
})

test('a delta is the step from the socket last value, and the value itself with no state', () => {
  const wire = lone(delta(0))
  const writer = createWireState()
  const reader = createWireState()
  const t = Date.UTC(2026, 0, 1)
  expect(wire.decode(wire.encode({ type: 'm', payload: t }, writer), reader).payload).toBe(t)
  const next = wire.encode({ type: 'm', payload: t + 50 }, writer)
  expect(next.length).toBe(2)
  expect(wire.decode(next, reader).payload).toBe(t + 50)
  expect(wire.decode(wire.encode({ type: 'm', payload: t - 7 }, writer), reader).payload).toBe(t - 7)
  expect(over(delta(0), t)).toBe(t)
})

describe('structs', () => {
  type Update = { alias: number; x?: number; y?: number; name?: string; flag?: boolean; target?: string | null }
  const update = struct<Update>({
    alias: uint,
    x: optional(num),
    y: optional(num),
    name: optional(str()),
    flag: optional(bool),
    target: optional(nullable(str())),
  })

  test('a field left out or undefined is not sent, null and false are values', () => {
    expect(over(update, { alias: 3 })).toEqual({ alias: 3 })
    expect(size(update, { alias: 3, x: undefined, y: 2 })).toBe(size(update, { alias: 3, y: 2 }))
    expect(over(update, { alias: 3, flag: false, target: null })).toEqual({ alias: 3, flag: false, target: null })
    const full = { alias: 3, x: 1.5, y: -2, name: 'n', flag: true, target: 't' }
    expect(over(update, full)).toStrictEqual(full)
  })

  test('an object read always has the first seven optional fields, and the later ones when they were sent', () => {
    const read = over(update, { y: 2, alias: 3 })
    expect(Object.keys(read)).toEqual(['alias', 'x', 'y', 'name', 'flag', 'target'])
    expect(read).toStrictEqual({ alias: 3, x: undefined, y: 2, name: undefined, flag: undefined, target: undefined })

    const keys = Array.from({ length: 10 }, (_, i) => `f${i}`)
    const wide = struct<Record<string, number | undefined>>(
      Object.fromEntries(keys.map(key => [key, optional(num)])) as never,
    )
    expect(Object.keys(over(wide, { f1: 1 }))).toEqual(keys.slice(0, 7))
    expect(Object.keys(over(wide, { f1: 1, f8: 8 }))).toEqual([...keys.slice(0, 7), 'f8'])
  })

  test('an exact struct reads the fields it was sent and no other', () => {
    type Pickup = { id: string; gold?: number; itemId?: string }
    const pickup = struct<Pickup>({ id: str(), gold: optional(num), itemId: optional(str()) }, { exact: true })
    const read = over(pickup, { id: 'p', gold: 5 })
    expect('gold' in read).toBe(true)
    expect('itemId' in read).toBe(false)
    expect(read).toStrictEqual({ id: 'p', gold: 5 })
  })

  test('an update costs its alias, a byte of mask and its values', () => {
    expect(size(update, { alias: 3 })).toBe(2)
    expect(size(update, { alias: 3, x: 77.5, y: 12.25 })).toBe(2 + 4 + 4)
  })

  test('a struct of sixty optional fields keeps each of them apart', () => {
    const keys = Array.from({ length: 56 }, (_, i) => `f${i}`)
    const wide = struct<Record<string, number | undefined>>(
      Object.fromEntries(keys.map(key => [key, optional(num)])) as never,
    )
    const random = createRandom(3)
    for (let round = 0; round < 200; round++) {
      const value: Record<string, number> = {}
      for (const key of keys) if (random() < (round % 3 === 0 ? 0.05 : 0.5)) value[key] = Math.floor(random() * 1000)
      expect(over(wide, value)).toEqual(value)
    }
    expect(over(wide, { f55: 1 })).toEqual({ f55: 1 })
    expect(over(wide, {})).toEqual({})
  })

  test('a field the schema does not know is left out, and fails the write of a test', () => {
    const extra = { alias: 1, x: 2, mystery: 3 } as Update
    expect(over(update, extra)).toEqual({ alias: 1, x: 2 })
    setWireStrict(true)
    expect(() => pack(update, extra)).toThrow('mystery')
    expect(over(update, { alias: 1, mystery: undefined } as Update)).toEqual({ alias: 1 })
  })

  test('a value of the wrong kind is refused, and the error names its field', () => {
    setWireStrict(true)
    expect(() => pack(update, { alias: 1, name: 5 as never })).toThrow('name')
    expect(() => pack(update, { alias: 1, x: 'far' as never })).toThrow('x')
  })
})

describe('closed lists and unions', () => {
  type Action = { name: 'jump' } | { name: 'dash'; rotZ: number } | { name: 'move'; x?: number; y?: number }
  const action = union<Action, 'name'>('name', {
    jump: {},
    dash: { rotZ: num },
    move: { x: optional(num), y: optional(num) },
  })
  const kind = oneOf(['mana', 'speed', 'vitals'])

  test('a variant is a byte and its fields', () => {
    expect(over(action, { name: 'jump' })).toEqual({ name: 'jump' })
    expect(over(action, { name: 'dash', rotZ: 1.5 })).toEqual({ name: 'dash', rotZ: 1.5 })
    expect(over(action, { name: 'move', y: 4 })).toEqual({ name: 'move', y: 4 })
    expect(size(action, { name: 'jump' })).toBe(1)
    expect(size(kind, 'vitals')).toBe(1)
    expect(over(kind, 'speed')).toBe('speed')
  })

  test('a value the schema lacks still goes through on a live server, and fails a test', () => {
    expect(over(kind, 'chaos' as never)).toBe('chaos' as never)
    expect(over(action, { name: 'fly', height: 3 } as never)).toEqual({ name: 'fly', height: 3 } as never)
    setWireStrict(true)
    expect(() => pack(kind, 'chaos' as never)).toThrow()
    expect(() => pack(action, { name: 'fly' } as never)).toThrow()
    expect(over(action, { name: 'dash', rotZ: 1 })).toEqual({ name: 'dash', rotZ: 1 })
  })
})

test('a record keeps its keys and their order', () => {
  const cooldowns = record(struct<{ current: number; max: number }>({ current: num, max: num }))
  const value = { GCD: { current: 0.5, max: 1 }, NBAkW: { current: 12, max: 30 } }
  expect(over(cooldowns, value)).toEqual(value)
  expect(Object.keys(over(cooldowns, value))).toEqual(['GCD', 'NBAkW'])
  expect(over(cooldowns, {})).toEqual({})
})

describe('self-described values', () => {
  test('whatever JSON takes comes back, undefined included', () => {
    const value = {
      a: [1, 'two', null, undefined, true, false, [], {}],
      b: { c: { d: [{ e: -1.5 }] } },
      text: 'héllo',
      n: Date.UTC(2026, 0, 1),
      missing: undefined,
    }
    expect(over(any(), value)).toStrictEqual(value)
    for (const scalar of [null, undefined, 0, 'x', false]) expect(over(any(), scalar)).toBe(scalar)
  })

  test('what JSON does not take is refused', () => {
    setWireStrict(true)
    for (const value of [new Date(), new Map(), new Uint8Array(4), 10n, () => 1])
      expect(() => pack(any(), value)).toThrow()
  })

  test('a value nested too deep is refused on the way in', () => {
    let nested: unknown = 1
    for (let i = 0; i < 100; i++) nested = [nested]
    const packed = pack(any(), nested)
    expect(() => lone(any()).decode(packed)).toThrow('deep')
  })
})

describe('a channel', () => {
  type Message = { type: 'a'; payload: { n: number; tags: string[] } } | { type: 'b'; payload?: undefined }
  const body = struct<{ n: number; tags: string[] }>({ n: num, tags: list(sym()) })
  const wire = channel<Message>([['a', body], ['b']])

  test('a message is a byte for its type, then its payload', () => {
    expect(wire.encode({ type: 'b' })).toEqual(new Uint8Array([1]))
    expect(wire.decode(new Uint8Array([1]))).toEqual({ type: 'b' })
    const message: Message = { type: 'a', payload: { n: 5, tags: ['x'] } }
    expect(wire.decode(wire.encode(message))).toEqual(message)
  })

  test('refuses a message cut short, one with bytes to spare, and a type it does not have', () => {
    const packed = wire.encode({ type: 'a', payload: { n: 77.5, tags: ['abc', 'def'] } })
    for (let length = 1; length < packed.length; length++)
      expect(() => wire.decode(packed.subarray(0, length))).toThrow()
    expect(() => wire.decode(new Uint8Array([...packed, 0]))).toThrow()
    expect(() => wire.decode(new Uint8Array([9]))).toThrow()
    expect(() => wire.decode(new Uint8Array(0))).toThrow()
    expect(() => wire.encode({ type: 'c' } as never)).toThrow()
  })

  test('encodeShared hands out the buffer the next write reuses, encode a copy', () => {
    const shared = wire.encodeShared({ type: 'a', payload: { n: 1, tags: [] } })
    const copy = wire.encode({ type: 'a', payload: { n: 1, tags: [] } })
    wire.encode({ type: 'b' })
    expect(shared[0]).toBe(1)
    expect(copy[0]).toBe(0)
  })

  test('random bytes are refused or decoded, never followed past their end', () => {
    const random = createRandom(11)
    type Loose = { a: number[]; b?: string[] }
    const loose = lone(list(struct<Loose>({ a: list(num), b: optional(list(sym())) })))
    const free = lone(any())
    for (let round = 0; round < 3000; round++) {
      const bytes = Uint8Array.from({ length: 1 + Math.floor(random() * 60) }, () =>
        random() < 0.3 ? 0 : Math.floor(random() * 256),
      )
      for (const target of [wire, loose, free]) {
        try {
          target.decode(bytes)
        } catch {
          // refused
        }
      }
    }
  })

  test('two schemas have two fingerprints', () => {
    const other = channel<Message>([['a', struct<{ n: number; tags: string[] }>({ tags: list(sym()), n: num })], ['b']])
    expect(other.fingerprint).not.toBe(wire.fingerprint)
    expect(channel<Message>([['a', body], ['b']]).fingerprint).toBe(wire.fingerprint)
  })
})

describe('a payload its schema refuses', () => {
  type Buff = { id: string; originatorId: string; t: number }
  const wire = lone(list(struct<Buff>({ id: sym(), originatorId: sym(), t: delta(3) })))
  const broken = [
    { id: 'b1', originatorId: 'me', t: 100 },
    { id: 'b2', originatorId: undefined as never, t: 150 },
  ]

  test('fails a test', () => {
    setWireStrict(true)
    expect(() => wire.encode({ type: 'm', payload: broken }, createWireState())).toThrow('originatorId')
  })

  test('still reaches a live client, whole, and leaves the socket in step', () => {
    const errors: unknown[] = []
    const report = console.error
    console.error = (line: unknown) => void errors.push(line)
    const writer = createWireState()
    const reader = createWireState()
    const send = (payload: Buff[]) => wire.decode(wire.encode({ type: 'm', payload }, writer), reader).payload
    try {
      const before = [{ id: 'b0', originatorId: 'me', t: 50 }]
      expect(send(before)).toEqual(before)
      expect(send(broken)).toStrictEqual(broken)
      expect(send(broken)).toStrictEqual(broken)
      const after = [
        { id: 'b1', originatorId: 'me', t: 200 },
        { id: 'b0', originatorId: 'you', t: 210 },
      ]
      expect(send(after)).toEqual(after)
    } finally {
      console.error = report
    }
    expect(errors).toHaveLength(1)
    expect(String(errors[0])).toContain('originatorId')
  })
})

describe('the compiled form and the interpreter', () => {
  type Buff = { id: string; kind: 'burn' | 'freeze' | 'stun'; value?: number; left: number }
  type Action = { name: 'jump' } | { name: 'dash'; rotZ: number } | { name: 'say'; text: string; loud?: boolean }
  type Update = {
    alias: number
    x?: number
    y?: number
    hp?: number
    zone?: string
    buffs?: Buff[]
    target?: string | null
    actions?: Action[]
    cooldowns?: Record<string, { current: number; max: number }>
    flag?: boolean
    extra?: unknown
    seat?: 0 | 1
    name?: string
  }
  const buff = struct<Buff>({
    id: sym(),
    kind: oneOf(['burn', 'freeze', 'stun']),
    left: num,
    value: optional(num),
  })
  const action = union<Action, 'name'>('name', {
    jump: {},
    dash: { rotZ: num },
    say: { text: str(), loud: optional(bool) },
  })
  const fields = {
    alias: uint,
    x: optional(num),
    y: optional(num),
    hp: optional(num),
    zone: optional(sym()),
    buffs: optional(list(buff)),
    target: optional(nullable(sym())),
    actions: optional(list(action)),
    cooldowns: optional(record(struct<{ current: number; max: number }>({ current: num, max: num }))),
    flag: optional(bool),
    extra: optional(any()),
    seat: optional(oneOf([0, 1])),
    name: optional(str()),
  }
  type Diff = { t: number; seq?: number; updates: Update[]; sparse?: Update[]; exact?: Update[]; me?: Update }
  type Message = { type: 'diff'; payload: Diff } | { type: 'beat'; payload?: undefined }
  const wire = channel<Message>([
    [
      'diff',
      struct<Diff>({
        t: delta(0),
        updates: list(struct<Update>(fields)),
        seq: optional(delta(1)),
        sparse: optional(list(struct<Update>(fields, { sparse: true }))),
        exact: optional(list(struct<Update>(fields, { exact: true, sparse: true }))),
        me: optional(struct<Update>(fields)),
      }),
    ],
    ['beat'],
  ])

  const random = createRandom(42)
  const pick = <T>(items: readonly T[]) => items[Math.floor(random() * items.length)]!
  const number = () =>
    pick([
      0,
      1,
      27,
      28,
      500,
      -1,
      -9000,
      70_000,
      2 ** 31,
      Math.fround(random() * 200),
      Math.fround(-random()),
      Math.fround(1e-30),
    ])
  const id = () => `id-${Math.floor(random() ** 2 * 400)}`
  const maybe = <T>(make: () => T) => (random() < 0.4 ? make() : undefined)
  const makeBuff = (): Buff => ({
    id: id(),
    kind: pick(['burn', 'freeze', 'stun']),
    left: number(),
    value: maybe(number),
  })
  const makeAction = (): Action =>
    pick<() => Action>([
      () => ({ name: 'jump' }),
      () => ({ name: 'dash', rotZ: number() }),
      () => ({ name: 'say', text: pick(['gg', 'héllo', '']), loud: maybe(() => random() < 0.5) }),
    ])()
  const makeUpdate = (): Update => {
    const update: Update = { alias: Math.floor(random() * 300) }
    const set: { [K in keyof Update]?: () => Update[K] } = {
      x: number,
      y: number,
      hp: number,
      zone: id,
      buffs: () => Array.from({ length: Math.floor(random() * 3) }, makeBuff),
      target: () => (random() < 0.3 ? null : id()),
      actions: () => Array.from({ length: Math.floor(random() * 3) }, makeAction),
      cooldowns: () =>
        Object.fromEntries(
          Array.from({ length: Math.floor(random() * 3) }, () => [id(), { current: number(), max: 30 }]),
        ),
      flag: () => random() < 0.5,
      extra: () => pick([null, 'text', [1, { a: undefined, b: [true] }], { deep: { er: 1.5 } }]),
      seat: () => pick([0, 1] as const),
      name: () => pick(['Ada', 'Ünïcödé', 'x'.repeat(300)]),
    }
    // in a random order: the shapes of updates built a field at a time
    for (const key of Object.keys(set).toSorted(() => random() - 0.5) as (keyof Update)[]) {
      if (random() < 0.3) (update as Record<string, unknown>)[key] = set[key]!()
    }
    return update
  }
  const makeDiff = (i: number): Message =>
    random() < 0.05
      ? { type: 'beat' }
      : {
          type: 'diff',
          payload: {
            t: 1_767_225_600_000 + i * 50,
            seq: maybe(() => i),
            updates: Array.from({ length: Math.floor(random() * 4) }, makeUpdate),
            sparse: maybe(() => Array.from({ length: Math.floor(random() * 6) }, makeUpdate)),
            exact: maybe(() => Array.from({ length: Math.floor(random() * 3) }, makeUpdate)),
            me: maybe(makeUpdate),
          },
        }

  const both = <T>(run: () => T): [T, T] => {
    setWireCompiled(true)
    const fast = run()
    setWireCompiled(false)
    const slow = run()
    setWireCompiled(true)
    return [fast, slow]
  }

  for (const stateful of [true, false]) {
    test(`write the same bytes and read the same objects, ${stateful ? 'with' : 'without'} state`, () => {
      const states = () => (stateful ? createWireState() : null)
      const [fastWriter, slowWriter, fastReader, slowReader] = [states(), states(), states(), states()]
      let bytes = 0
      for (let i = 0; i < 1500; i++) {
        const message = makeDiff(i)
        const fast = wire.encode(message, fastWriter)
        setWireCompiled(false)
        const slow = wire.encode(message, slowWriter)
        setWireCompiled(true)
        expect(slow.toHex()).toBe(fast.toHex())
        const read = wire.decode(fast, fastReader)
        setWireCompiled(false)
        const readSlow = wire.decode(fast, slowReader)
        setWireCompiled(true)
        expect(read).toStrictEqual(readSlow)
        expect(read).toEqual(message)
        bytes += fast.length
      }
      expect(bytes).toBeGreaterThan(50_000)
    })
  }

  test('write and read a fixed number alike, inline in a small struct and by call in a big one', () => {
    type Pose = { x: number; y?: number; rotZ?: number }
    const pose = { x: fixed(512), y: optional(fixed(512)), rotZ: optional(fixed(1024)) }
    const padding = Object.fromEntries(Array.from({ length: 14 }, (_, i) => [`pad${i}`, optional(bool)]))
    const poses = lone(
      struct<{ small: Pose[]; big: Pose[]; sparse: Pose[] }>({
        small: list(struct<Pose>(pose)),
        big: list(struct<Pose>({ ...pose, ...padding } as typeof pose)),
        sparse: list(struct<Pose>({ ...pose, ...padding } as typeof pose, { sparse: true })),
      }),
    )
    const value = () =>
      pick([0, 0.1, -0.1, 0.13, 15.99, 16, -16.01, 2047.99, -2048, 2048, -2048.01, 5e6, -7e9, (random() - 0.5) * 6000])
    const makePose = (): Pose => ({ x: value(), y: maybe(value), rotZ: maybe(() => (random() - 0.5) * 7) })
    const makePoses = () => Array.from({ length: Math.floor(random() * 5) }, makePose)
    const stepped = ({ x, y, rotZ }: Pose): Pose => ({
      x: Math.round(x * 512) / 512,
      y: y === undefined ? undefined : Math.round(y * 512) / 512,
      rotZ: rotZ === undefined ? undefined : Math.round(rotZ * 1024) / 1024,
    })
    for (let i = 0; i < 800; i++) {
      const message = { type: 'm' as const, payload: { small: makePoses(), big: makePoses(), sparse: makePoses() } }
      const [fast, slow] = both(() => poses.encode(message))
      expect(slow.toHex()).toBe(fast.toHex())
      const [read, readSlow] = both(() => poses.decode(fast).payload)
      expect(read).toStrictEqual(readSlow)
      expect(read).toEqual({
        small: message.payload.small.map(stepped),
        big: message.payload.big.map(stepped),
        sparse: message.payload.sparse.map(stepped),
      })
    }
  })

  test('refuse the same payloads, and send them self-described the same', () => {
    setWireStrict(true)
    const bad = { type: 'diff', payload: { t: 5, updates: [{ alias: 1, hp: 'full' }] } } as unknown as Message
    const [fast, slow] = both(() => {
      try {
        wire.encode(bad)
        return 'sent'
      } catch (error) {
        return (error as Error).message
      }
    })
    expect(fast).toBe(slow)
    expect(fast).toContain('hp')
    setWireStrict(false)
    const report = console.error
    console.error = () => undefined
    try {
      const [packed, packedSlow] = both(() => wire.encode(bad))
      expect(packed.toHex()).toBe(packedSlow.toHex())
      expect(wire.decode(packed)).toEqual(bad)
    } finally {
      console.error = report
    }
  })

  test('floats past the end of the buffer are written again in a longer one too', () => {
    const points = lone(list(struct<{ id: string; x: number; y: number }>({ id: sym(), x: float, y: float })))
    const writer = createWireState()
    const reader = createWireState()
    const big = Array.from({ length: 300_000 }, (_, i) => ({ id: `p${i % 50}`, x: i + 0.5, y: -i }))
    const packed = points.encode({ type: 'm', payload: big }, writer)
    expect(packed.length).toBeGreaterThan(2_000_000)
    expect(points.decode(packed, reader).payload).toEqual(big)
    const small = [{ id: 'p7', x: 1.5, y: 2 }]
    expect(points.encode({ type: 'm', payload: small }, writer).length).toBe(1 + 1 + 1 + 4 + 4)
  })

  test('a message longer than the buffer is written again in a longer one, state unharmed', () => {
    const big: Message = {
      type: 'diff',
      payload: { t: 9, updates: Array.from({ length: 6000 }, (_, i) => ({ alias: i, zone: `zone-${i}`, x: i + 0.5 })) },
    }
    const writer = createWireState()
    const reader = createWireState()
    const small: Message = { type: 'diff', payload: { t: 5, updates: [{ alias: 1, zone: 'zone-1' }] } }
    expect(wire.decode(wire.encode(small, writer), reader)).toEqual(small)
    const packed = wire.encode(big, writer)
    expect(packed.length).toBeGreaterThan(64 * 1024)
    expect(wire.decode(packed, reader)).toEqual(big)
    expect(wire.decode(wire.encode(small, writer), reader)).toEqual(small)
  })
})
