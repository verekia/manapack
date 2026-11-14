import { createDecoder, readAny } from 'lib0/decoding'
import { createEncoder, toUint8Array, writeAny } from 'lib0/encoding'

export const name = 'lib0'
export const pkg = 'lib0'
export const kind = 'schemaless'
export const notes = 'writeAny and readAny; it writes a float as float32 when that loses nothing'

const session = () => ({
  encode: message => {
    const encoder = createEncoder()
    writeAny(encoder, message)
    return toUint8Array(encoder)
  },
  decode: data => readAny(createDecoder(data)),
})

export const workloads = { snapshot: session, update: session, input: session }
