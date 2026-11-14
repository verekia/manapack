// A schema-driven binary codec for the messages of a socket (README.md)

export type Codec<T> = {
  // Writes at `o` and returns the offset after. Past the end of `u8` nothing is written and the offset still moves:
  // the caller grows the buffer and writes again.
  w: (value: T, u8: Uint8Array, o: number) => number
  // Reads at `o` and leaves the offset after in `cursor.o`
  r: (u8: Uint8Array, o: number) => T
  // What the fingerprint of a channel is made of: two builds decode each other only with the same one
  sig: string
  // Strict mode: throws on what a live write lets through (a value a closed list lacks) or leaves out (an unknown field)
  check?: (value: T) => void
  // The source of a write of the expression `value`, and of a read into `target`, for the compiled form. Both run
  // with `u8` and `o` in scope and must give the bytes `w` and `r` give.
  gw?: (g: Gen, value: string) => string
  gr?: (g: Gen, target: string) => string
}

export type OptionalCodec<T> = { optional: Codec<T> }

type Gen = {
  // A name the compiled code reads a value of this module by
  ref: (value: unknown) => string
  // The compiled function of a struct or a union, made once per channel
  fn: (owner: object, kind: 'w' | 'r', make: (name: string) => string) => string
  id: () => number
  // The function being made is small enough to carry its number code itself: a large one runs faster calling out
  inline: boolean
  // ...and to carry a small struct's code in place of a call to it
  nest: boolean
}

// What a socket's two ends keep in step, message after message: the ids already named and the last of each delta
export type WireState = {
  ring: (string | undefined)[]
  slots: Map<string, number> | null
  next: number
  deltas: number[]
}

export const createWireState = (): WireState => ({ ring: [], slots: null, next: 0, deltas: [] })

// Ids a socket keeps named at once; the oldest gives its number to the next new one
const SYM_SLOTS = 256
const MAX_DEPTH = 32

// Where a read ended, and the two halves of a struct's mask
const cursor = { o: 0, low: 0, high: 0 }
let state: WireState | null = null
// The field the interpreter is writing, for the error of a value the schema does not take
let at = ''
let strict = false
let compiled = true
try {
  // oxlint-disable-next-line no-new-func
  new Function('')
} catch {
  // a page whose content security policy forbids it runs the interpreter
  compiled = false
}

// Tests and bots: a field its schema does not know, or a value a closed list lacks, fails the write. A live server
// leaves the one out, sends the other self-described, and carries on.
export const setWireStrict = (on: boolean) => {
  strict = on
}

// Tests: run the interpreter where the compiled form would
export const setWireCompiled = (on: boolean) => {
  compiled = on
}

// What the write under way changed of its socket's state, to take back if it fails
const evictions: (string | undefined)[] = []
const deltasBefore: number[] = []

// A float32 crosses as the 32 bits `u32` reads of it, high byte first. Its four bytes are never stored one by one
// before the float is read: a processor waits on a load wider than the stores it comes from.
const f32 = new Float32Array(1)
const u32 = new Uint32Array(f32.buffer)
const f64 = new Float64Array(1)
const f64b = new Uint8Array(f64.buffer)

const wUint = (v: number, u8: Uint8Array, o: number): number => {
  if (v >>> 0 !== v) {
    if (!(v >= 0) || Math.floor(v) !== v || v > Number.MAX_SAFE_INTEGER)
      throw new Error(`not an unsigned integer: ${v}`)
    // past 32 bits: the low 28 as four bytes, the rest is under 2^25
    const high = Math.floor(v / 0x10000000)
    const low = v - high * 0x10000000
    u8[o] = low | 128
    u8[o + 1] = (low >>> 7) | 128
    u8[o + 2] = (low >>> 14) | 128
    u8[o + 3] = (low >>> 21) | 128
    o += 4
    v = high
  }
  while (v > 127) {
    u8[o++] = v | 128
    v >>>= 7
  }
  u8[o++] = v
  return o
}

const rUint = (u8: Uint8Array, o: number): number => {
  let b = u8[o++]!
  let v = b & 127
  for (let shift = 7; b >= 128 && shift < 28; shift += 7) {
    b = u8[o++]!
    v |= (b & 127) << shift
  }
  if (b >= 128) {
    // past 28 bits
    let high = 0
    let shift = 0
    do {
      b = u8[o++]!
      high |= (b & 127) << shift
      shift += 7
    } while (b >= 128 && shift < 28)
    v += high * 0x10000000
  }
  cursor.o = o
  return v
}

const wInt = (v: number, u8: Uint8Array, o: number) => wUint(v < 0 ? -2 * v - 1 : 2 * v, u8, o)

const rInt = (u8: Uint8Array, o: number): number => {
  const u = rUint(u8, o)
  return u % 2 === 0 ? u / 2 : -(u + 1) / 2
}

// Three bytes are always stored and `o` moves by the ones the number takes: no branch on its size to mispredict
const wFixed = (steps: number, v: number, u8: Uint8Array, o: number): number => {
  if (typeof v !== 'number') throw new Error(`not a number: ${v}`)
  const s = v * steps
  if (s > -0x100000 && s < 0xfffff) {
    const n = ((s + 1048576.5) | 0) - 0x100000
    const z = (n << 1) ^ (n >> 31)
    const a = (127 - z) >> 31
    const b = (16383 - z) >> 31
    u8[o] = z | (a & 128)
    u8[o + 1] = (z >>> 7) | (b & 128)
    u8[o + 2] = z >>> 14
    return o + 1 - a - b
  }
  const n = Math.round(s)
  if (!(Math.abs(n) < 2 ** 52)) throw new Error(`no whole number of steps in ${v}`)
  return wInt(n, u8, o)
}

const rFixed = (step: number, u8: Uint8Array, o: number): number => rInt(u8, o) * step

// A number in 1 byte (0 to 27), 2 (an integer within ±8192) or 4 (a float32, which holds any integer up to 2^24).
// The first byte of a float32 is its sign and exponent: the ones no game value has (under 1e-19, over 1e19) are the
// integers' and the escapes'. An integer float32 cannot hold goes whole, in 9; a fraction is rounded to float32.
const wNum = (v: number, u8: Uint8Array, o: number): number => {
  const i = v | 0
  if (i === v) {
    if (i >= 0) {
      if (i < 28) {
        u8[o++] = 0x60 + i
        return o
      }
      if (i < 8192) {
        u8[o++] = i >> 8
        u8[o++] = i
        return o
      }
    } else if (i >= -8192) {
      const n = ~i
      u8[o++] = 0x80 | (n >> 8)
      u8[o++] = n
      return o
    }
  }
  if (typeof v !== 'number') throw new Error(`not a number: ${v}`)
  f32[0] = v
  const rounded = f32[0]!
  if (rounded !== v) {
    if (Math.floor(v) === v) {
      u8[o++] = 0x7e
      f64[0] = v
      for (let b = 0; b < 8; b++) u8[o++] = f64b[b]!
      return o
    }
    // a fraction whose float32 is a whole number goes as that number
    if ((rounded | 0) === rounded && rounded >= -8192 && rounded < 8192) return wNum(rounded, u8, o)
  }
  const bits = u32[0]!
  const exponent = (bits >>> 24) & 0x7f
  if (exponent < 0x20 || (exponent >= 0x60 && exponent !== 0x7f)) u8[o++] = 0x7d
  u8[o] = bits >>> 24
  u8[o + 1] = bits >>> 16
  u8[o + 2] = bits >>> 8
  u8[o + 3] = bits
  return o + 4
}

const rNum = (u8: Uint8Array, o: number): number => {
  let b0 = u8[o++]!
  const exponent = b0 & 0x7f
  if (exponent < 0x20) {
    const n = (exponent << 8) | u8[o++]!
    cursor.o = o
    return b0 < 0x80 ? n : ~n
  }
  if (b0 >= 0x60 && b0 < 0x7c) {
    cursor.o = o
    return b0 - 0x60
  }
  if (b0 === 0x7e) {
    for (let b = 0; b < 8; b++) f64b[b] = u8[o++]!
    cursor.o = o
    return f64[0]!
  }
  if (b0 === 0x7d) b0 = u8[o++]!
  else if (!(exponent < 0x60 || exponent === 0x7f)) throw new Error(`bad number byte ${b0}`)
  u32[0] = (b0 << 24) | (u8[o]! << 16) | (u8[o + 1]! << 8) | u8[o + 2]!
  cursor.o = o + 3
  return f32[0]!
}

const wFloat = (v: number, u8: Uint8Array, o: number): number => {
  if (typeof v !== 'number') throw new Error(`not a number: ${v}`)
  f32[0] = v
  const bits = u32[0]!
  u8[o] = bits >>> 24
  u8[o + 1] = bits >>> 16
  u8[o + 2] = bits >>> 8
  u8[o + 3] = bits
  return o + 4
}

const rFloat = (u8: Uint8Array, o: number): number => {
  u32[0] = (u8[o]! << 24) | (u8[o + 1]! << 16) | (u8[o + 2]! << 8) | u8[o + 3]!
  cursor.o = o + 4
  return f32[0]!
}

const encoder = new TextEncoder()
const decoder = new TextDecoder()

const wStr = (s: string, u8: Uint8Array, o: number): number => {
  if (typeof s !== 'string') throw new Error(`not a string: ${s}`)
  const length = s.length
  if (length < 128) {
    const start = o++
    let i = 0
    for (; i < length; i++) {
      const c = s.charCodeAt(i)
      if (c > 127) break
      u8[o++] = c
    }
    if (i === length) {
      u8[start] = length
      return o
    }
    o = start
  }
  const from = o + 5
  const most = length * 3
  if (from + most > u8.length) return from + most
  const { written } = encoder.encodeInto(s, u8.subarray(from, from + most))
  o = wUint(written, u8, o)
  u8.copyWithin(o, from, from + written)
  return o + written
}

// Under this length a string of ASCII is built four characters at a time: a TextDecoder costs more to call
const SHORT_STRING = 16

const text = (u8: Uint8Array, o: number, end: number): string => {
  if (end - o < SHORT_STRING) {
    let s = ''
    let i = o
    for (; i + 4 <= end; i += 4) {
      const a = u8[i]!
      const b = u8[i + 1]!
      const c = u8[i + 2]!
      const d = u8[i + 3]!
      if ((a | b | c | d) > 127) return decoder.decode(u8.subarray(o, end))
      s += String.fromCharCode(a, b, c, d)
    }
    for (; i < end; i++) {
      const a = u8[i]!
      if (a > 127) return decoder.decode(u8.subarray(o, end))
      s += String.fromCharCode(a)
    }
    return s
  }
  return decoder.decode(u8.subarray(o, end))
}

const rStr = (u8: Uint8Array, o: number): string => {
  let length = u8[o++]!
  if (length > 127) {
    length = rUint(u8, o - 1)
    o = cursor.o
  }
  const end = o + length
  if (!(end <= u8.length)) throw new Error('string past the end')
  cursor.o = end
  return text(u8, o, end)
}

// The strings a stateless channel spells every time (a zone id, a key of a self-described object) are few: the
// last read of each comes back without being built again, once checked against the bytes
const RECENT = 256
const RECENT_UP_TO = 32
const recent: string[] = Array.from({ length: RECENT }, () => '')

const rSpelled = (u8: Uint8Array, o: number): string => {
  const length = u8[o]!
  if (length === 0 || length > RECENT_UP_TO) return rStr(u8, o)
  const from = o + 1
  const end = from + length
  if (!(end <= u8.length)) throw new Error('string past the end')
  const slot =
    (length * 31 +
      u8[from]! * 7 +
      u8[from + (length >> 1)]! * 13 +
      u8[end - 1]! * 17 +
      u8[end - 2 < from ? from : end - 2]! * 3) &
    (RECENT - 1)
  const known = recent[slot]!
  if (known.length === length) {
    let i = 0
    while (i < length && known.charCodeAt(i) === u8[from + i]) i++
    if (i === length) {
      cursor.o = end
      return known
    }
  }
  const s = rStr(u8, o)
  if (s.length === length) recent[slot] = s
  return s
}

// A string a socket names once: 0 and the string the first time, its slot + 2 after that. With no state (a message
// packed once for many sockets, or one the reader may drop unread), 1 and the string every time.
const wSym = (s: string, u8: Uint8Array, o: number): number => {
  const st = state
  if (!st) {
    u8[o++] = 1
    return wStr(s, u8, o)
  }
  const slots = (st.slots ??= new Map())
  const known = slots.get(s)
  if (known !== undefined) {
    if (known < 126) {
      u8[o++] = known + 2
      return o
    }
    return wUint(known + 2, u8, o)
  }
  u8[o++] = 0
  o = wStr(s, u8, o)
  const slot = st.next
  st.next = slot + 1 === SYM_SLOTS ? 0 : slot + 1
  const evicted = st.ring[slot]
  evictions.push(evicted)
  if (evicted !== undefined) slots.delete(evicted)
  st.ring[slot] = s
  slots.set(s, slot)
  return o
}

const rSym = (u8: Uint8Array, o: number): string => {
  let k = u8[o++]!
  if (k === 1) return rSpelled(u8, o)
  const st = state
  if (!st) throw new Error('a named string on a stateless channel')
  if (k !== 0) {
    if (k > 127) {
      k = rUint(u8, o - 1)
      o = cursor.o
    }
    const known = st.ring[k - 2]
    if (known === undefined) throw new Error(`unknown string ${k - 2}`)
    cursor.o = o
    return known
  }
  const s = rStr(u8, o)
  const slot = st.next
  st.next = slot + 1 === SYM_SLOTS ? 0 : slot + 1
  st.ring[slot] = s
  return s
}

const wDelta = (slot: number, v: number, u8: Uint8Array, o: number): number => {
  const st = state
  if (!st) return wInt(v, u8, o)
  const step = v - (st.deltas[slot] ?? 0)
  st.deltas[slot] = v
  if (step >= 0 && step < 64) {
    u8[o++] = step << 1
    return o
  }
  return wInt(step, u8, o)
}

const rDelta = (slot: number, u8: Uint8Array, o: number): number => {
  const st = state
  if (!st) return rInt(u8, o)
  return (st.deltas[slot] = (st.deltas[slot] ?? 0) + rInt(u8, o))
}

const rCount = (u8: Uint8Array, o: number): number => {
  const n = rUint(u8, o)
  // every value is at least a byte
  if (!(n <= u8.length - cursor.o)) throw new Error('list past the end')
  return n
}

const MASK_WORD_BITS = 28

const wMask = (low: number, high: number, u8: Uint8Array, o: number): number => {
  if (high === 0) return wUint(low, u8, o)
  u8[o++] = low | 128
  u8[o++] = (low >> 7) | 128
  u8[o++] = (low >> 14) | 128
  u8[o++] = (low >> 21) | 128
  return wUint(high, u8, o)
}

const rMask = (u8: Uint8Array, o: number) => {
  let b = u8[o++]!
  let low = b & 127
  let high = 0
  if (b >= 128) {
    b = u8[o++]!
    low |= (b & 127) << 7
    if (b >= 128) {
      b = u8[o++]!
      low |= (b & 127) << 14
      if (b >= 128) {
        b = u8[o++]!
        low |= (b & 127) << 21
        if (b >= 128) {
          high = rUint(u8, o)
          o = cursor.o
        }
      }
    }
  }
  cursor.low = low
  cursor.high = high
  cursor.o = o
}

const ANY_UNDEFINED = 0
const ANY_NULL = 1
const ANY_FALSE = 2
const ANY_TRUE = 3
const ANY_NUMBER = 4
const ANY_STRING = 5
const ANY_ARRAY = 6
const ANY_OBJECT = 7

let depth = 0

const wAny = (value: unknown, u8: Uint8Array, o: number): number => {
  if (value === undefined) u8[o++] = ANY_UNDEFINED
  else if (value === null) u8[o++] = ANY_NULL
  else if (value === false) u8[o++] = ANY_FALSE
  else if (value === true) u8[o++] = ANY_TRUE
  else if (typeof value === 'number') {
    u8[o++] = ANY_NUMBER
    o = wNum(value, u8, o)
  } else if (typeof value === 'string') {
    u8[o++] = ANY_STRING
    o = wStr(value, u8, o)
  } else if (Array.isArray(value)) {
    u8[o++] = ANY_ARRAY
    o = wUint(value.length, u8, o)
    for (let i = 0; i < value.length; i++) o = wAny(value[i], u8, o)
  } else if (typeof value === 'object' && (value.constructor === Object || value.constructor === undefined)) {
    u8[o++] = ANY_OBJECT
    const object = value as Record<string, unknown>
    const keys = Object.keys(object)
    o = wUint(keys.length, u8, o)
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i]!
      o = wSym(key, u8, o)
      o = wAny(object[key], u8, o)
    }
  } else throw new Error(`a ${typeof value} has no wire form`)
  return o
}

const rAny = (u8: Uint8Array, o: number): unknown => {
  const kind = u8[o++]
  switch (kind) {
    case ANY_UNDEFINED:
      cursor.o = o
      return undefined
    case ANY_NULL:
      cursor.o = o
      return null
    case ANY_FALSE:
      cursor.o = o
      return false
    case ANY_TRUE:
      cursor.o = o
      return true
    case ANY_NUMBER:
      return rNum(u8, o)
    case ANY_STRING:
      return rStr(u8, o)
    case ANY_ARRAY: {
      const n = rCount(u8, o)
      if (++depth > MAX_DEPTH) throw new Error('nested too deep')
      const values: unknown[] = []
      for (let i = 0; i < n; i++) values.push(rAny(u8, cursor.o))
      depth--
      return values
    }
    case ANY_OBJECT: {
      const n = rCount(u8, o)
      if (++depth > MAX_DEPTH) throw new Error('nested too deep')
      const object: Record<string, unknown> = {}
      for (let i = 0; i < n; i++) {
        const key = rSym(u8, cursor.o)
        object[key] = rAny(u8, cursor.o)
      }
      depth--
      return object
    }
    default:
      throw new Error(`bad value kind ${kind}`)
  }
}

// The buffer every message is written in, and the view the compiled writers set a float32 through in one call
let buf = new Uint8Array(64 * 1024)
const out = { view: new DataView(buf.buffer) }

// What the compiled code calls by name
const HELPERS = {
  cursor,
  out,
  f32,
  u32,
  wUint,
  rUint,
  wNum,
  rNum,
  wFloat,
  rFloat,
  wFixed,
  rFixed,
  wStr,
  rStr,
  wSym,
  rSym,
  wDelta,
  rDelta,
  wMask,
  rMask,
}
const HELPER_NAMES = Object.keys(HELPERS)

const property = (object: string, key: string) => `${object}[${JSON.stringify(key)}]`

// one and two bytes in place, the longer ones out of line
const gwUint = (g: Gen, value: string) => {
  const x = `x${g.id()}`
  return (
    `{const ${x}=${value};if(${x}>>>0!==${x}||${x}>16383)o=wUint(${x},u8,o);` +
    `else if(${x}<128)u8[o++]=${x};else{u8[o++]=${x}|128;u8[o++]=${x}>>>7}}`
  )
}
const grUint = (g: Gen, target: string) => {
  const b = `b${g.id()}`
  return (
    `{const ${b}=u8[o++];if(${b}<128)${target}=${b};` +
    `else{const c=u8[o++];if(c<128)${target}=(${b}&127)|(c<<7);else{${target}=rUint(u8,o-2);o=cursor.o}}}`
  )
}

export const num: Codec<number> = {
  w: wNum,
  r: rNum,
  sig: 'n',
  gw: (g, value) => {
    if (!g.inline) return `o=wNum(${value},u8,o);`
    const x = `x${g.id()}`
    return (
      `{const ${x}=${value};` +
      `if(typeof ${x}!=='number')o=wNum(${x},u8,o);` +
      `else if((${x}|0)===${x}){if(${x}>=0&&${x}<28)u8[o++]=96+${x};else o=wNum(${x},u8,o)}` +
      `else{f32[0]=${x};const r=f32[0],n=u32[0],e=(n>>>24)&127;` +
      `if(e>=32&&e<96&&(r|0)!==r&&(r===${x}||Math.floor(${x})!==${x})){u8[o]=n>>>24;u8[o+1]=n>>>16;u8[o+2]=n>>>8;u8[o+3]=n;o+=4}` +
      `else o=wNum(${x},u8,o)}}`
    )
  },
  gr: (g, target) => {
    if (!g.inline) return `${target}=rNum(u8,o);o=cursor.o;`
    const b = `b${g.id()}`
    return (
      `{const ${b}=u8[o],e=${b}&127;` +
      `if(e>=32&&e<96){u32[0]=(${b}<<24)|(u8[o+1]<<16)|(u8[o+2]<<8)|u8[o+3];o+=4;${target}=f32[0]}` +
      `else if(${b}>=96&&${b}<124){o++;${target}=${b}-96}` +
      `else{${target}=rNum(u8,o);o=cursor.o}}`
    )
  },
}

// A float32 as its four bytes, for a field that is hardly ever a whole number (a position, an angle): a little
// faster to write than `num`, which first looks for the integer it could send shorter
export const float: Codec<number> = {
  w: wFloat,
  r: rFloat,
  sig: 'f',
  gw: (g, value) => {
    if (!g.inline) return `o=wFloat(${value},u8,o);`
    const x = `x${g.id()}`
    return `{const ${x}=${value};if(typeof ${x}!=='number')o=wFloat(${x},u8,o);else{dv.setFloat32(o,${x});o+=4}}`
  },
  gr: (_g, target) => `u32[0]=(u8[o]<<24)|(u8[o+1]<<16)|(u8[o+2]<<8)|u8[o+3];o+=4;${target}=f32[0];`,
}

const wByte = (v: number, u8: Uint8Array, o: number): number => {
  if ((v & 255) !== v) throw new Error(`not a byte: ${v}`)
  u8[o] = v
  return o + 1
}

// A number rounded to a step of 1 / steps and sent as the whole number of them, 1 to 3 bytes within a million
// steps either side of 0: a position to 2 mm in 3 bytes where a float32 takes 4. For what a reader draws, never
// for what a server or a prediction computes with. `steps` is a power of two, so that a step is exact.
export const fixed = (steps: number): Codec<number> => {
  if (!Number.isInteger(Math.log2(steps))) throw new Error(`${steps} steps is not a power of two`)
  const step = 1 / steps
  const read = (z: string) => `((${z}>>>1)^-(${z}&1))*${step}`
  return {
    w: (v, u8, o) => wFixed(steps, v, u8, o),
    r: (u8, o) => rFixed(step, u8, o),
    sig: `x${steps}`,
    gw: (g, value) => {
      if (!g.inline) return `o=wFixed(${steps},${value},u8,o);`
      const [x, s] = [`x${g.id()}`, `s${g.id()}`]
      return (
        `{const ${x}=${value},${s}=typeof ${x}==='number'?${x}*${steps}:NaN;` +
        `if(${s}>-1048576&&${s}<1048575){const n=((${s}+1048576.5)|0)-1048576,z=(n<<1)^(n>>31),` +
        `a=(127-z)>>31,b=(16383-z)>>31;` +
        `u8[o]=z|(a&128);u8[o+1]=(z>>>7)|(b&128);u8[o+2]=z>>>14;o+=1-a-b}` +
        `else o=wFixed(${steps},${x},u8,o)}`
      )
    },
    gr: (g, target) => {
      const b = `b${g.id()}`
      return (
        `{const ${b}=u8[o];if(${b}<128){o++;${target}=${read(b)}}` +
        `else{const c=u8[o+1];if(c<128){o+=2;const z=(${b}&127)|(c<<7);${target}=${read('z')}}` +
        `else{const d=u8[o+2];if(d<128){o+=3;const z=(${b}&127)|((c&127)<<7)|(d<<14);${target}=${read('z')}}` +
        `else{${target}=rFixed(${step},u8,o);o=cursor.o}}}}`
      )
    },
  }
}

// A whole number from 0 to 255
export const byte: Codec<number> = {
  w: wByte,
  r: (u8, o) => {
    cursor.o = o + 1
    return u8[o]!
  },
  sig: 'B',
  gw: (g, value) => {
    const x = `x${g.id()}`
    return `{const ${x}=${value};if((${x}&255)!==${x})o=${g.ref(wByte)}(${x},u8,o);else u8[o++]=${x}}`
  },
  gr: (_g, target) => `${target}=u8[o++];`,
}

// A non-negative integer, 1 byte under 128
export const uint: Codec<number> = { w: wUint, r: rUint, sig: 'u', gw: gwUint, gr: grUint }

export const bool: Codec<boolean> = {
  w: (v, u8, o) => {
    u8[o++] = v ? 1 : 0
    return o
  },
  r: (u8, o) => {
    cursor.o = o + 1
    return u8[o] === 1
  },
  sig: 'b',
  gw: (_g, value) => `u8[o++]=${value}?1:0;`,
  gr: (_g, target) => `${target}=u8[o++]===1;`,
}

const strCodec: Codec<string> = {
  w: wStr,
  r: rStr,
  sig: 's',
  gw: (_g, value) => `o=wStr(${value},u8,o);`,
  gr: (_g, target) => `${target}=rStr(u8,o);o=cursor.o;`,
}
const symCodec: Codec<string> = {
  w: wSym,
  r: rSym,
  sig: 'y',
  gw: (_g, value) => `o=wSym(${value},u8,o);`,
  gr: (_g, target) => `${target}=rSym(u8,o);o=cursor.o;`,
}
// Free text
export const str = <T extends string = string>() => strCodec as unknown as Codec<T>
// An id or any other string that comes back: named once per socket
export const sym = <T extends string = string>() => symCodec as unknown as Codec<T>

const ESCAPE = 255

// One of a closed list, as its index. A value the list lacks still goes, self-described: no socket is lost to it.
export const oneOf = <const T extends string | number | boolean>(values: readonly T[]): Codec<T> => {
  const indexOf = new Map(values.map((value, i) => [value, i]))
  if (values.length >= ESCAPE) throw new Error(`a closed list takes ${ESCAPE - 1} values at most`)
  const codec: Codec<T> = {
    w: (v, u8, o) => {
      const i = indexOf.get(v)
      if (i === undefined) {
        u8[o++] = ESCAPE
        return wAny(v, u8, o)
      }
      u8[o++] = i
      return o
    },
    r: (u8, o) => {
      const i = u8[o++]!
      if (i === ESCAPE) return rAny(u8, o) as T
      if (!(i < values.length)) throw new Error(`no value ${i} in ${values.join(', ')}`)
      cursor.o = o
      return values[i]!
    },
    check: v => {
      if (!indexOf.has(v)) throw new Error(`${String(v)} is not one of ${values.join(', ')}`)
    },
    sig: `e(${values.join(',')})`,
    gw: (g, value) =>
      `switch(${value}){${values.map((v, i) => `case ${JSON.stringify(v)}:u8[o++]=${i};break;`).join('')}default:o=${g.ref(codec)}.w(${value},u8,o)}`,
    gr: (g, target) => {
      const i = `i${g.id()}`
      return `{const ${i}=u8[o++];if(${i}<${values.length})${target}=${g.ref(values)}[${i}];else{${target}=${g.ref(codec)}.r(u8,o-1);o=cursor.o}}`
    },
  }
  return codec
}

// An integer that moves little from one message of the socket to the next (a clock, a sequence number)
export const delta = (slot: number): Codec<number> => ({
  w: (v, u8, o) => wDelta(slot, v, u8, o),
  r: (u8, o) => rDelta(slot, u8, o),
  sig: `d${slot}`,
  gw: (_g, value) => `o=wDelta(${slot},${value},u8,o);`,
  gr: (_g, target) => `${target}=rDelta(${slot},u8,o);o=cursor.o;`,
})

const gwOf = <T>(codec: Codec<T>, g: Gen, value: string) =>
  codec.gw ? codec.gw(g, value) : `o=${g.ref(codec)}.w(${value},u8,o);`
const grOf = <T>(codec: Codec<T>, g: Gen, target: string) =>
  codec.gr ? codec.gr(g, target) : `${target}=${g.ref(codec)}.r(u8,o);o=cursor.o;`

export const nullable = <T>(codec: Codec<T>): Codec<T | null> => ({
  w: (v, u8, o) => {
    if (v === null) {
      u8[o++] = 0
      return o
    }
    u8[o++] = 1
    return codec.w(v, u8, o)
  },
  r: (u8, o) => {
    if (u8[o] === 0) {
      cursor.o = o + 1
      return null
    }
    return codec.r(u8, o + 1)
  },
  check: codec.check && (v => v !== null && codec.check!(v)),
  sig: `?${codec.sig}`,
  gw: (g, value) => {
    const x = `x${g.id()}`
    return `{const ${x}=${value};if(${x}===null)u8[o++]=0;else{u8[o++]=1;${gwOf(codec, g, x)}}}`
  },
  gr: (g, target) => `if(u8[o++]===0)${target}=null;else{${grOf(codec, g, target)}}`,
})

export const list = <T>(codec: Codec<T>): Codec<T[]> => ({
  w: (values, u8, o) => {
    const n = values.length
    o = wUint(n, u8, o)
    for (let i = 0; i < n; i++) o = codec.w(values[i]!, u8, o)
    return o
  },
  r: (u8, o) => {
    const n = rCount(u8, o)
    const values: T[] = []
    for (let i = 0; i < n; i++) values.push(codec.r(u8, cursor.o))
    return values
  },
  check: codec.check && (values => values.forEach(codec.check!)),
  sig: `[${codec.sig}]`,
  gw: (g, value) => {
    const id = g.id()
    const [a, n, i] = [`a${id}`, `n${id}`, `i${id}`]
    return `{const ${a}=${value},${n}=${a}.length;${gwUint(g, n)}for(let ${i}=0;${i}<${n};${i}++){${gwOf(codec, g, `${a}[${i}]`)}}}`
  },
  gr: (g, target) => {
    const id = g.id()
    const [a, n, i] = [`a${id}`, `n${id}`, `i${id}`]
    return (
      `{let ${n};${grUint(g, n)}if(!(${n}<=u8.length-o))throw new Error('list past the end');` +
      `const ${a}=new Array(${n});for(let ${i}=0;${i}<${n};${i}++){${grOf(codec, g, `${a}[${i}]`)}}${target}=${a}}`
    )
  },
})

// An object under keys the schema does not know (a cooldown per action id)
export const record = <K extends string, T>(codec: Codec<T>): Codec<Record<K, T>> => ({
  w: (values, u8, o) => {
    let n = 0
    for (const key in values) if (values[key] !== undefined) n++
    o = wUint(n, u8, o)
    for (const key in values) {
      const value = values[key]
      if (value === undefined) continue
      o = wSym(key, u8, o)
      o = codec.w(value, u8, o)
    }
    return o
  },
  r: (u8, o) => {
    const n = rCount(u8, o)
    const values = {} as Record<string, T>
    for (let i = 0; i < n; i++) {
      const key = rSym(u8, cursor.o)
      values[key] = codec.r(u8, cursor.o)
    }
    return values
  },
  check:
    codec.check &&
    (values => {
      for (const key in values) if (values[key] !== undefined) codec.check!(values[key])
    }),
  sig: `(${codec.sig})`,
})

export const optional = <T>(codec: Codec<T>): OptionalCodec<T> => ({ optional: codec })

export type Fields<T> = {
  [K in keyof T]-?: undefined extends T[K] ? OptionalCodec<Exclude<T[K], undefined>> : Codec<T[K]>
}

// A compiled struct of more fields than this calls out for its numbers
const INLINE_UP_TO = 12
// The optional fields every object read carries, sent or not: the ones of the mask's first byte
const ALWAYS_READ = 7

export type StructOptions = {
  // An object read has the optional fields it was sent and no other, for a reader that asks `in`
  exact?: boolean
  // The values come with few of their fields and in many shapes (an update built field by field): a writer walks
  // the keys they have, where it would read every field of the schema off objects of one shape
  sparse?: boolean
}

type Layout = {
  sig: string
  w: (value: object, u8: Uint8Array, o: number) => number
  // reads the fields into `out`, which may hold a union's tag already
  into: (out: Record<string, unknown>, u8: Uint8Array, o: number) => void
  check: (value: object) => void
  // Small enough for its compiled code to sit in the function that uses it
  small: boolean
  // The compiled write of the object named `v`, and the compiled read, which leaves the object in the constant it
  // names: `first` is a union's tag. Their locals carry a number of their own, so one can sit inside another.
  gw: (g: Gen, v: string) => string
  gr: (g: Gen, first?: string) => { body: string; object: string }
}

// `tag`: the field a union reads before the struct does
const layoutOf = (
  fields: Fields<object>,
  tag?: string,
  { exact = false, sparse = false }: StructOptions = {},
): Layout => {
  const requiredKeys: string[] = []
  const requiredCodecs: Codec<unknown>[] = []
  const keys: string[] = []
  const codecs: Codec<unknown>[] = []
  const sigs: string[] = []
  for (const key in fields) {
    const field = (fields as Record<string, Codec<unknown> | OptionalCodec<unknown>>)[key]!
    if ('optional' in field) {
      keys.push(key)
      codecs.push(field.optional)
      sigs.push(`${key}?:${field.optional.sig}`)
    } else {
      requiredKeys.push(key)
      requiredCodecs.push(field)
      sigs.push(`${key}:${field.sig}`)
    }
  }
  const required = requiredKeys.length
  const optionals = keys.length
  if (optionals > 2 * MASK_WORD_BITS) throw new Error(`a struct takes ${2 * MASK_WORD_BITS} optional fields at most`)
  const indexOf: Record<string, number> = Object.create(null)
  keys.forEach((key, i) => (indexOf[key] = i))
  const found: unknown[] = keys.map(() => undefined)
  const always = exact ? 0 : Math.min(optionals, ALWAYS_READ)
  const known = new Set([...requiredKeys, ...keys, ...(tag === undefined ? [] : [tag])])
  const all = [
    ...requiredKeys.map((key, i) => [key, requiredCodecs[i]!] as const),
    ...keys.map((key, i) => [key, codecs[i]!] as const),
  ]

  const w = (value: object, u8: Uint8Array, o: number): number => {
    const object = value as Record<string, unknown>
    for (let i = 0; i < required; i++) {
      at = requiredKeys[i]!
      o = requiredCodecs[i]!.w(object[at], u8, o)
    }
    if (optionals === 0) return o
    let low = 0
    let high = 0
    if (sparse) {
      for (const key in object) {
        const i = indexOf[key]
        if (i === undefined) continue
        const field = object[key]
        if (field === undefined) continue
        found[i] = field
        if (i < MASK_WORD_BITS) low |= 1 << i
        else high |= 1 << (i - MASK_WORD_BITS)
      }
    } else {
      for (let i = 0; i < optionals; i++) {
        const field = object[keys[i]!]
        if (field === undefined) continue
        found[i] = field
        low |= 1 << i
      }
    }
    o = wMask(low, high, u8, o)
    for (let i = 0; low !== 0; i++, low >>>= 1) {
      if ((low & 1) === 0) continue
      at = keys[i]!
      const field = found[i]
      found[i] = undefined
      o = codecs[i]!.w(field, u8, o)
    }
    for (let i = MASK_WORD_BITS; high !== 0; i++, high >>>= 1) {
      if ((high & 1) === 0) continue
      at = keys[i]!
      const field = found[i]
      found[i] = undefined
      o = codecs[i]!.w(field, u8, o)
    }
    return o
  }

  const into = (out: Record<string, unknown>, u8: Uint8Array, o: number) => {
    for (let i = 0; i < required; i++) {
      out[requiredKeys[i]!] = requiredCodecs[i]!.r(u8, o)
      o = cursor.o
    }
    if (optionals === 0) {
      cursor.o = o
      return
    }
    rMask(u8, o)
    const { low, high } = cursor
    for (let i = 0; i < optionals; i++) {
      const sent = ((i < MASK_WORD_BITS ? low : high) >>> (i % MASK_WORD_BITS)) & 1
      if (sent) out[keys[i]!] = codecs[i]!.r(u8, cursor.o)
      else if (i < always) out[keys[i]!] = undefined
    }
    const spare = optionals % MASK_WORD_BITS || MASK_WORD_BITS
    if (optionals <= MASK_WORD_BITS ? low >>> spare !== 0 || high !== 0 : high >>> spare !== 0)
      throw new Error('a field the schema lacks')
  }

  const check = (value: object) => {
    const object = value as Record<string, unknown>
    for (const key in object) {
      if (!known.has(key) && object[key] !== undefined) throw new Error(`${key} is not in the schema`)
    }
    for (const [key, codec] of all) {
      if (!codec.check || object[key] === undefined) continue
      at = key
      codec.check(object[key])
    }
  }

  const small = required + optionals <= INLINE_UP_TO && !sparse

  const gw = (g: Gen, v: string) => {
    const n = g.id()
    const p = (i: number) => `p${n}_${i}`
    const [m, h] = [`m${n}`, `h${n}`]
    let body = requiredKeys.map((key, i) => gwOf(requiredCodecs[i]!, g, property(v, key))).join('')
    if (optionals === 0) return body
    const word = (i: number) => (i < MASK_WORD_BITS ? m : h)
    const bit = (i: number) => 1 << (i % MASK_WORD_BITS)
    if (sparse) {
      body += `let ${m}=0,${h}=0,${keys.map((_, i) => p(i)).join(',')};for(const k in ${v}){switch(k){`
      body += keys
        .map(
          (key, i) =>
            `case ${JSON.stringify(key)}:{const t=${v}[k];if(t!==undefined){${p(i)}=t;${word(i)}|=${bit(i)}}break}`,
        )
        .join('')
      body += `}}`
    } else {
      body += `const ${keys.map((key, i) => `${p(i)}=${property(v, key)}`).join(',')};`
      const mask = (from: number, to: number) =>
        keys
          .slice(from, to)
          .map((_, i) => `(${p(from + i)}!==undefined?${bit(from + i)}:0)`)
          .join('|') || '0'
      body += `const ${m}=${mask(0, MASK_WORD_BITS)},${h}=${mask(MASK_WORD_BITS, optionals)};`
    }
    const two = `{u8[o++]=${m}|128;u8[o++]=${m}>>>7}`
    if (optionals > MASK_WORD_BITS)
      body += `if(${h}===0&&${m}<128)u8[o++]=${m};else if(${h}===0&&${m}<16384)${two}else o=wMask(${m},${h},u8,o);`
    else if (optionals > 14) body += `if(${m}<128)u8[o++]=${m};else if(${m}<16384)${two}else o=wUint(${m},u8,o);`
    else if (optionals > 7) body += `if(${m}<128)u8[o++]=${m};else${two}`
    else body += `u8[o++]=${m};`
    return body + keys.map((_, i) => `if(${word(i)}&${bit(i)}){${gwOf(codecs[i]!, g, p(i))}}`).join('')
  }

  const gr = (g: Gen, first = '') => {
    const n = g.id()
    const p = (i: number) => `p${n}_${i}`
    const q = (i: number) => `q${n}_${i}`
    const [m, h, v] = [`m${n}`, `h${n}`, `v${n}`]
    let body = requiredKeys.map((_, i) => `let ${q(i)};${grOf(requiredCodecs[i]!, g, q(i))}`).join('')
    const literal = [first, ...requiredKeys.map((key, i) => `${JSON.stringify(key)}:${q(i)}`)].filter(Boolean)
    // the second byte here, the longer masks out of line
    const more = (wide: string) => `if(${m}>127){const b=u8[o++];if(b<128)${m}=(${m}&127)|(b<<7);else{${wide}}}`
    if (optionals > MASK_WORD_BITS)
      body += `let ${m}=u8[o++],${h}=0;${more(`rMask(u8,o-2);${m}=cursor.low;${h}=cursor.high;o=cursor.o`)}`
    else if (optionals > 7) body += `let ${m}=u8[o++];const ${h}=0;${more(`${m}=rUint(u8,o-2);o=cursor.o`)}`
    else if (optionals > 0) body += `const ${m}=u8[o++],${h}=0;`
    const sent = (i: number) => `${i < MASK_WORD_BITS ? m : h}&${1 << (i % MASK_WORD_BITS)}`
    if (optionals > 0) {
      const spare = optionals % MASK_WORD_BITS || MASK_WORD_BITS
      body += `if(${optionals <= MASK_WORD_BITS ? m : h}>>>${spare})throw new Error('a field the schema lacks');`
    }
    const fixed = keys.slice(0, always)
    if (always > 0) body += `let ${fixed.map((_, i) => p(i)).join(',')};`
    // the fields most often sent read their numbers in place whatever the size of the struct
    const { inline } = g
    g.inline = true
    body += fixed.map((_, i) => `if(${sent(i)}){${grOf(codecs[i]!, g, p(i))}}`).join('')
    g.inline = inline
    literal.push(...fixed.map((key, i) => `${JSON.stringify(key)}:${p(i)}`))
    body += `const ${v}={${literal.join(',')}};`
    for (let i = always; i < optionals; i++) body += `if(${sent(i)}){${grOf(codecs[i]!, g, property(v, keys[i]!))}}`
    return { body, object: v }
  }

  return { sig: `{${sigs.join(',')}}`, w, into, check, small, gw, gr }
}

// Required fields in the order given, a bit per optional field, then the optional fields that are there. A field
// left undefined is not sent. An object read always has the first seven optional fields, undefined when left out:
// put the ones most often sent first and nearly every object read has one shape for the engine, in one mask byte.
// A struct cannot hold itself.
export const struct = <T extends object>(fields: NoInfer<Fields<T>>, options?: StructOptions): Codec<T> => {
  const layout = layoutOf(fields as Fields<object>, undefined, options)
  const codec: Codec<T> = {
    w: layout.w,
    r: (u8, o) => {
      const out = {}
      layout.into(out, u8, o)
      return out as T
    },
    check: layout.check,
    sig: layout.sig,
    gw: (g, value) => {
      if (layout.small && g.nest) {
        const v = `v${g.id()}`
        g.nest = false
        const body = layout.gw(g, v)
        g.nest = true
        return `{const ${v}=${value};${body}}`
      }
      const make = (name: string) => {
        g.inline = g.nest = layout.small
        return `function ${name}(v,u8,o){const dv=out.view;${layout.gw(g, 'v')}return o}`
      }
      return `o=${g.fn(codec, 'w', make)}(${value},u8,o);`
    },
    gr: (g, target) => {
      if (layout.small && g.nest) {
        g.nest = false
        const { body, object } = layout.gr(g)
        g.nest = true
        return `{${body}${target}=${object}}`
      }
      const make = (name: string) => {
        g.inline = g.nest = layout.small
        const { body, object } = layout.gr(g)
        return `function ${name}(u8,o){${body}cursor.o=o;return ${object}}`
      }
      return `${target}=${g.fn(codec, 'r', make)}(u8,o);o=cursor.o;`
    },
  }
  return codec
}

type Variants<T, Tag extends keyof T> = {
  [V in T[Tag] & string]: Fields<Omit<Extract<T, Record<Tag, V>>, Tag>>
}

// Objects told apart by one field: its value as an index, then the fields of that variant. A variant the schema
// lacks still goes, self-described.
export const union = <T extends object, Tag extends keyof T & string>(
  tag: Tag,
  variants: NoInfer<Variants<T, Tag>>,
): Codec<T> => {
  const names = Object.keys(variants)
  const layouts = names.map(name => layoutOf(variants[name as keyof typeof variants] as Fields<object>, tag))
  const indexOf: Record<string, number> = Object.create(null)
  names.forEach((name, i) => (indexOf[name] = i))
  if (names.length >= ESCAPE) throw new Error(`a union takes ${ESCAPE - 1} variants at most`)
  const codec: Codec<T> = {
    w: (value, u8, o) => {
      const i = indexOf[value[tag] as string]
      if (i === undefined) {
        u8[o++] = ESCAPE
        return wAny(value, u8, o)
      }
      u8[o++] = i
      return layouts[i]!.w(value, u8, o)
    },
    r: (u8, o) => {
      const i = u8[o++]!
      if (i === ESCAPE) return rAny(u8, o) as T
      const layout = layouts[i]
      if (!layout) throw new Error(`no variant ${i} of ${tag}`)
      const out: Record<string, unknown> = { [tag]: names[i] }
      layout.into(out, u8, o)
      return out as T
    },
    check: value => {
      const i = indexOf[value[tag] as string]
      if (i === undefined) throw new Error(`no variant ${String(value[tag])} of ${tag}`)
      layouts[i]!.check(value)
    },
    sig: `<${tag}|${names.map((name, i) => `${name}:${layouts[i]!.sig}`).join('|')}>`,
    gw: (g, value) => {
      const make = (name: string) => {
        g.inline = true
        g.nest = false
        const cases = names.map(
          (variant, i) => `case ${JSON.stringify(variant)}:{u8[o++]=${i};${layouts[i]!.gw(g, 'v')}return o}`,
        )
        return `function ${name}(v,u8,o){const dv=out.view;switch(${property('v', tag)}){${cases.join('')}default:return ${g.ref(codec)}.w(v,u8,o)}}`
      }
      return `o=${g.fn(codec, 'w', make)}(${value},u8,o);`
    },
    gr: (g, target) => {
      const make = (name: string) => {
        g.inline = true
        g.nest = false
        const cases = names.map((variant, i) => {
          const { body, object } = layouts[i]!.gr(g, `${JSON.stringify(tag)}:${JSON.stringify(variant)}`)
          return `case ${i}:{${body}cursor.o=o;return ${object}}`
        })
        return `function ${name}(u8,o){switch(u8[o++]){${cases.join('')}default:return ${g.ref(codec)}.r(u8,o-1)}}`
      }
      return `${target}=${g.fn(codec, 'r', make)}(u8,o);o=cursor.o;`
    },
  }
  return codec
}

// Whatever JSON takes, self-described: for the messages too rare to earn a schema
const anyCodec: Codec<unknown> = { w: wAny, r: rAny, sig: 'a' }
export const any = <T = unknown>() => anyCodec as Codec<T>

type Compiled = { w: (Codec<unknown>['w'] | undefined)[]; r: (Codec<unknown>['r'] | undefined)[] }

// The codecs as functions of straight-line code, which an engine runs as if written by hand
const compile = (codecs: (Codec<unknown> | undefined)[]): Compiled => {
  const refs: unknown[] = []
  const functions = new Map<object, Partial<Record<'w' | 'r', string>>>()
  const sources: string[] = []
  let ids = 0
  const g: Gen = {
    ref: value => {
      const known = refs.indexOf(value)
      return `k${known === -1 ? refs.push(value) - 1 : known}`
    },
    fn: (owner, kind, make) => {
      const made = functions.get(owner) ?? {}
      functions.set(owner, made)
      if (!made[kind]) {
        const name = `${kind}${ids++}`
        made[kind] = name
        const { inline, nest } = g
        sources.push(make(name))
        g.inline = inline
        g.nest = nest
      }
      return made[kind]
    },
    id: () => ids++,
    inline: true,
    // a message's own struct is a function of its own: in the entry function it ran slower
    nest: false,
  }
  const writers = codecs.map(codec =>
    codec ? `function(v,u8,o){const dv=out.view;${gwOf(codec, g, 'v')}return o}` : 'undefined',
  )
  const readers = codecs.map(codec =>
    codec ? `function(u8,o){let t;${grOf(codec, g, 't')}cursor.o=o;return t}` : 'undefined',
  )
  const source =
    `'use strict';const {${HELPER_NAMES.join(',')}}=H;${refs.map((_, i) => `const k${i}=K[${i}];`).join('')}` +
    `${sources.join('\n')}\nreturn{w:[${writers.join(',')}],r:[${readers.join(',')}]}`
  // oxlint-disable-next-line no-new-func
  return new Function('H', 'K', source)(HELPERS, refs) as Compiled
}

const fingerprintOf = (text: string) => {
  let hash = 2166136261
  for (let i = 0; i < text.length; i++) hash = Math.imul(hash ^ text.charCodeAt(i), 16777619)
  return hash >>> 0
}

type Message = { type: string | number; payload?: unknown }
type Entry<M extends Message> = {
  [Type in M['type']]: readonly [Type, Codec<Extract<M, { type: Type }>['payload']>?]
}[M['type']]

// On the type byte: the payload is self-described, its schema did not take it
const UNTYPED = 0x80
const warned = new Set<string>()
// A view of `buf` per length: nearly every message is short, and a view costs as much to make as a message to write
const VIEWS = 2048
let views: (Uint8Array | undefined)[] = []

// No message is this long: past it a RangeError is the payload's, not the buffer's
const MOST = 64 * 1024 * 1024

const grow = (needed: number) => {
  buf = new Uint8Array(Math.max(buf.length * 2, needed))
  out.view = new DataView(buf.buffer)
  views = []
}

const takeBack = (st: WireState, next: number) => {
  for (let i = evictions.length - 1; i >= 0; i--) {
    const slot = (next + i) % SYM_SLOTS
    st.slots!.delete(st.ring[slot]!)
    const evicted = evictions[i]
    st.ring[slot] = evicted
    if (evicted !== undefined) st.slots!.set(evicted, slot)
  }
  st.next = next
  st.deltas.length = deltasBefore.length
  for (let i = 0; i < deltasBefore.length; i++) st.deltas[i] = deltasBefore[i]!
}

// The messages one way of a socket: a byte for the type, then its payload. A message type takes its index in
// `entries`, so a new one goes at the end.
export const channel = <M extends Message>(entries: readonly Entry<M>[]) => {
  const types = entries.map(([type]) => type)
  const codecs = entries.map(([, codec]) => codec as Codec<unknown> | undefined)
  const indexOf = new Map(types.map((type, i) => [type, i]))
  if (types.length > UNTYPED) throw new Error(`a channel takes ${UNTYPED} message types at most`)
  // made on the first message: a process that imports the schemas and sends nothing compiles nothing
  let made: Compiled | null | undefined
  const fastOf = () => (made === undefined ? (made = compiled ? compile(codecs) : null) : made)

  // Why the interpreter refuses the payload, written to nowhere
  const refusal = (i: number, payload: unknown, error: unknown) => {
    const kept = state
    state = null
    at = ''
    let reason = (error as Error).message
    try {
      codecs[i]!.w(payload, new Uint8Array(0), 0)
    } catch (again) {
      reason = (again as Error).message
    }
    state = kept
    return `manapack: ${types[i]} at ${at}: ${reason}`
  }

  // The bytes are in a buffer the next write reuses: for a send that copies them before it returns. A payload its
  // schema refuses still goes, self-described: a socket is never lost to a value nobody foresaw.
  const encodeShared = (message: M, st: WireState | null = null): Uint8Array => {
    const i = message.type === types[0] ? 0 : indexOf.get(message.type)
    if (i === undefined) throw new Error(`manapack: no message type ${message.type}`)
    const codec = codecs[i]
    const { payload } = message
    state = st
    const next = st ? st.next : 0
    if (st) {
      const { deltas } = st
      deltasBefore.length = deltas.length
      for (let slot = 0; slot < deltas.length; slot++) deltasBefore[slot] = deltas[slot]!
    }
    if (strict && codec?.check) {
      at = ''
      try {
        codec.check(payload)
      } catch (error) {
        throw new Error(`manapack: ${message.type} at ${at}: ${(error as Error).message}`, { cause: error })
      }
    }
    const write = (compiled && fastOf()?.w[i]) || codec?.w
    let typed = true
    for (;;) {
      evictions.length = 0
      let o = 1
      if (typed) {
        buf[0] = i
        try {
          if (write) o = write(payload, buf, 1)
        } catch (error) {
          if (st) takeBack(st, next)
          // a float set past the end of the buffer
          if (error instanceof RangeError && buf.length < MOST) {
            grow(0)
            continue
          }
          const reason = refusal(i, payload, error)
          if (strict) throw new Error(reason, { cause: error })
          if (!warned.has(reason) && warned.size < 100) {
            warned.add(reason)
            console.error(`${reason} (sent self-described)`)
          }
          typed = false
          continue
        }
      } else {
        buf[0] = i | UNTYPED
        o = wAny(payload, buf, 1)
      }
      if (o < VIEWS) return (views[o] ??= buf.subarray(0, o))
      if (o <= buf.length) return buf.subarray(0, o)
      if (st) takeBack(st, next)
      grow(o)
    }
  }

  return {
    encodeShared,
    encode: (message: M, st: WireState | null = null): Uint8Array => encodeShared(message, st).slice(),
    decode: (data: Uint8Array, st: WireState | null = null): M => {
      state = st
      depth = 0
      const byte = data[0]!
      const i = byte & ~UNTYPED
      if (!(i < types.length)) throw new Error(`manapack: no message type ${byte}`)
      const read = byte >= UNTYPED ? rAny : (compiled && fastOf()?.r[i]) || codecs[i]?.r
      cursor.o = 1
      const message = (read ? { type: types[i], payload: read(data, 1) } : { type: types[i] }) as M
      if (cursor.o !== data.length) throw new Error(`manapack: ${types[i]} ends at ${cursor.o} of ${data.length}`)
      return message
    },
    fingerprint: fingerprintOf(
      `${SYM_SLOTS}|${entries.map(([type, codec]) => `${type}=${codec?.sig ?? ''}`).join('|')}`,
    ),
  }
}
