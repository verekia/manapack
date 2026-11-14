import { Decoder, Encoder, FLOAT32_OPTIONS } from 'cbor-x'

export const name = 'cbor-x'
export const pkg = 'cbor-x'
export const kind = 'schemaless'
export const notes = 'plain CBOR maps (useRecords: false), variableMapSize, useFloat32: ALWAYS (lossless here)'

const encoder = new Encoder({ useRecords: false, variableMapSize: true, useFloat32: FLOAT32_OPTIONS.ALWAYS })
const decoder = new Decoder({ useRecords: false })
const session = () => ({ encode: message => encoder.encode(message), decode: data => decoder.decode(data) })

export const workloads = { snapshot: session, update: session, input: session }
