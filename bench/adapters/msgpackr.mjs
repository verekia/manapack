import { FLOAT32_OPTIONS, Packr, Unpackr } from 'msgpackr'

export const name = 'msgpackr'
export const pkg = 'msgpackr'
export const kind = 'schemaless'
export const notes = 'plain MessagePack maps (useRecords: false), variableMapSize, useFloat32: ALWAYS (lossless here)'

const packr = new Packr({ useRecords: false, variableMapSize: true, useFloat32: FLOAT32_OPTIONS.ALWAYS })
const unpackr = new Unpackr({ useRecords: false })
const session = () => ({ encode: message => packr.pack(message), decode: data => unpackr.unpack(data) })

export const workloads = { snapshot: session, update: session, input: session }
