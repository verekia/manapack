import notepack from 'notepack.io'

export const name = 'notepack.io'
export const pkg = 'notepack.io'
export const kind = 'schemaless'
export const notes = 'encode and decode (it has no options); floats are always float64'

const session = () => ({ encode: message => notepack.encode(message), decode: data => notepack.decode(data) })

export const workloads = { snapshot: session, update: session, input: session }
