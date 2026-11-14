import { CborDecoder } from '@jsonjoy.com/json-pack/lib/cbor/CborDecoder.js'
import { CborEncoder } from '@jsonjoy.com/json-pack/lib/cbor/CborEncoder.js'

export const name = '@jsonjoy.com/json-pack (CBOR)'
export const pkg = '@jsonjoy.com/json-pack'
export const kind = 'schemaless'
export const notes = 'reused CborEncoder and CborDecoder; it writes a float as float32 when that loses nothing'

const encoder = new CborEncoder()
const decoder = new CborDecoder()
const session = () => ({ encode: message => encoder.encode(message), decode: data => decoder.decode(data) })

export const workloads = { snapshot: session, update: session, input: session }
