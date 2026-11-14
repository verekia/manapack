import { createWireState, fixed } from '../../library/dist/index.js'

import { sessions, version as libraryVersion } from './manapack.mjs'

export const name = 'manapack (socket state, fixed-point positions)'
export const kind = 'schema'
export const version = libraryVersion
export const notes = 'x and y of an entity to 2 mm (fixed(512)) where the rows above send a float32'

const { snapshot, update } = sessions(fixed(512), createWireState)
export const workloads = { snapshot, update }
