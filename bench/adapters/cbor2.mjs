import { decode, encode } from 'cbor2'

export const name = 'cbor2'
export const pkg = 'cbor2'
export const kind = 'schemaless'
export const notes = 'encode and decode with default options: floats in the shortest lossless size'

const session = () => ({ encode: message => encode(message), decode: data => decode(data) })

export const workloads = { snapshot: session, update: session, input: session }
