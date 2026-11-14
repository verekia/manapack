import { Decoder, Encoder } from 'cbor-x'

export const name = 'cbor-x'
export const pkg = 'cbor-x'
export const kind = 'schemaless'
export const notes = 'plain CBOR maps (useRecords: false); floats are float64'

const encoder = new Encoder({ useRecords: false })
const decoder = new Decoder({ useRecords: false })
const session = () => ({ encode: message => encoder.encode(message), decode: data => decoder.decode(data) })

export const workloads = { snapshot: session, update: session, input: session }
