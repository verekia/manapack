import msgpack from 'msgpack-lite'

export const name = 'msgpack-lite'
export const pkg = 'msgpack-lite'
export const kind = 'schemaless'
export const notes = 'encode and decode with the default codec; floats are always float64'

const session = () => ({ encode: message => msgpack.encode(message), decode: data => msgpack.decode(data) })

export const workloads = { snapshot: session, update: session, input: session }
