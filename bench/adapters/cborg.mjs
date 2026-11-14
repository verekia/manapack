import { decode, encode } from 'cborg'

export const name = 'cborg'
export const pkg = 'cborg'
export const kind = 'schemaless'
export const notes = 'encode and decode with default options: sorted map keys, floats in the shortest lossless size'

const session = () => ({ encode: message => encode(message), decode: data => decode(data) })

export const workloads = { snapshot: session, update: session, input: session }
