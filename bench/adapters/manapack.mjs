import {
  bool,
  byte,
  channel,
  delta,
  float,
  list,
  oneOf,
  optional,
  str,
  struct,
  sym,
  uint,
} from '../../library/dist/index.js'
import { KINDS, STANCES } from '../workloads.mjs'

export const name = 'manapack'
export const kind = 'schema'
export const version = JSON.parse(
  (await import('node:fs')).readFileSync(new URL('../../library/package.json', import.meta.url)),
).version
export const notes = 'no state: any reader takes any message'

export const schemas = position => ({
  snapshot: struct({
    t: uint,
    entities: list(
      struct({
        id: sym(),
        name: str(),
        kind: oneOf(KINDS),
        x: position,
        y: position,
        rot: float,
        health: uint,
        maxHealth: uint,
        mana: uint,
        level: byte,
        alive: bool,
      }),
    ),
  }),
  update: struct({
    t: delta(0),
    ack: delta(1),
    updates: list(
      struct(
        {
          id: sym(),
          x: optional(position),
          y: optional(position),
          rot: optional(float),
          vx: optional(float),
          vy: optional(float),
          health: optional(uint),
          mana: optional(uint),
          stance: optional(oneOf(STANCES)),
        },
        { sparse: true },
      ),
    ),
  }),
  input: struct({
    seq: delta(0),
    t: delta(1),
    x: float,
    y: float,
    vx: float,
    vy: float,
    rot: float,
    zone: sym(),
    actions: list(struct({ ability: sym(), target: optional(sym()) })),
  }),
})

export const sessions = (position, makeState) =>
  Object.fromEntries(
    Object.entries(schemas(position)).map(([type, schema]) => {
      const wire = channel([[type, schema]])
      return [
        type,
        () => {
          const state = makeState()
          const message = { type, payload: undefined }
          return {
            encode: payload => {
              message.payload = payload
              return wire.encode(message, state)
            },
            decode: data => wire.decode(data, state).payload,
          }
        },
      ]
    }),
  )

export const workloads = sessions(float, () => null)
