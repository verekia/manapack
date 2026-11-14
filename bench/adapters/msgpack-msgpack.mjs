import { Decoder, Encoder } from '@msgpack/msgpack'

export const name = '@msgpack/msgpack'
export const pkg = '@msgpack/msgpack'
export const kind = 'schemaless'
export const notes = 'reused Encoder and Decoder; forceFloat32 (lossless here: every float is a float32)'

const encoder = new Encoder({ forceFloat32: true })
const decoder = new Decoder()
const session = () => ({ encode: message => encoder.encode(message), decode: data => decoder.decode(data) })

export const workloads = { snapshot: session, update: session, input: session }
