import { ALWAYS, Decoder, Encoder } from 'cbor-x'

export const name = 'cbor-x (records, float32)'
export const pkg = 'cbor-x'
export const kind = 'schemaless'
export const notes = 'sequential record structures per socket, read in order; useFloat32: ALWAYS'

const session = () => {
  const encoder = new Encoder({ sequential: true, useFloat32: ALWAYS })
  // Decoder ignores `sequential`: its own DecoderStream keeps the structures of a stream this way
  const decoder = new Decoder({ structures: [] })
  return { encode: message => encoder.encode(message), decode: data => decoder.decode(data) }
}

export const workloads = { snapshot: session, update: session, input: session }
