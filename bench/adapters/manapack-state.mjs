import { createWireState, float } from '../../library/dist/index.js'
import { sessions, version as libraryVersion } from './manapack.mjs'

export const name = 'manapack (socket state)'
export const kind = 'schema'
export const stateful = true
export const version = libraryVersion
export const notes = 'a state per socket: an id is spelled once, a clock is a step'

export const workloads = sessions(float, createWireState)
